"""Small, on-demand browser bridge. Live calls stay on its scheduled thread."""
import collections
import hashlib
import json
import os
import socket
import time
import uuid

import Live
from _Framework.ControlSurface import ControlSurface


def create_instance(c_instance):
    return LiveBridgeBrowser(c_instance)


class LiveBridgeBrowser(ControlSurface):
    def __init__(self, c_instance):
        super(LiveBridgeBrowser, self).__init__(c_instance)
        with open(os.path.join(os.path.dirname(__file__), 'config.json'), 'r') as f:
            self.config = json.load(f)
        self.session = str(uuid.uuid4())
        self.items = {}
        self.targets = {}
        self.receipts = collections.OrderedDict()
        self.busy = False
        self.running = True
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind(('127.0.0.1', self.config['port']))
        self.sock.setblocking(False)
        self.schedule_message(1, self.poll)
        self.log_message('LiveBridgeBrowser 0.4 ready on loopback')

    def disconnect(self):
        if getattr(self, 'recording', None) is not None:
            self.finish_recording(self.recording, 'cancelled', 'Remote Script disconnected')
        self.running = False
        if self.sock:
            self.sock.close()
            self.sock = None
        self.items.clear()
        self.targets.clear()
        super(LiveBridgeBrowser, self).disconnect()

    def send(self, address, rid, result=None, error=None):
        if self.running:
            data = json.dumps({'id': rid, 'result': result, 'error': error}, ensure_ascii=True).encode('utf8')
            if len(data) > 60000:
                data = json.dumps({'id': rid, 'error': 'Response too large; narrow request'}).encode('utf8')
            self.sock.sendto(data, address)

    def poll(self):
        if not self.running:
            return
        try:
            for _ in range(4):
                try:
                    data, address = self.sock.recvfrom(16384)
                except BlockingIOError:
                    break
                req = None
                try:
                    req = json.loads(data.decode('utf8'))
                    if address[0] != '127.0.0.1' or req.get('token') != self.config['token']:
                        continue
                    rid = req['id']
                    if rid in self.receipts:
                        self.send(address, rid, **self.receipts[rid])
                        continue
                    if self.busy:
                        raise RuntimeError('Browser operation in progress; wait and inspect before retry')
                    result = self.dispatch(req, address)
                    if result is not None:
                        self.send(address, rid, result=result)
                except Exception as e:
                    if req and req.get('token') == self.config['token']:
                        self.send(address, req.get('id'), error=str(e))
        finally:
            if self.running:
                self.schedule_message(1, self.poll)

    def tracks(self):
        song = self.song()
        return list(song.tracks) + list(song.return_tracks) + [song.master_track]

    def signature(self, track):
        data = [(str(d._live_ptr), d.name, d.class_name) for d in track.devices]
        return hashlib.sha256(json.dumps(data).encode('utf8')).hexdigest()

    def snapshot(self):
        result = []
        song = self.song()
        for t in self.tracks():
            key = str(t._live_ptr)
            self.targets[key] = t
            kind = 'master' if t == song.master_track else 'return' if t in song.return_tracks else 'track'
            result.append({'targetId': key, 'name': t.name, 'kind': kind,
                           'hasAudioOutput': bool(t.has_audio_output), 'fingerprint': self.signature(t),
                           'devices': [{'name': d.name, 'className': d.class_name} for d in t.devices]})
        return result

    def dispatch(self, req, address):
        op = req['op']
        if getattr(self, 'recording', None) is not None and op not in ('status', 'automation_record_status', 'automation_record_stop'):
            raise RuntimeError('Recording active; inspect or stop before other remote operations')
        if op.startswith('automation_record_'):
            return self.recording_operation(req)
        if op.startswith('automation_'):
            return self.automation(req)
        if op == 'status':
            browser = self.application().browser
            return {'version': '0.4.0', 'session': self.session, 'playing': self.song().is_playing,
                    'capabilities': {'pluginInsertion': 'any_searched_plugin', 'automation': 'session_envelopes_v1', 'arrangementRecording': 'bounded_gestures_v1'},
                    'roots': [k for k in ('plugins', 'audio_effects', 'user_library') if hasattr(browser, k)],
                    'tracks': self.snapshot()}
        if op == 'search':
            query = req.get('query', '').strip().lower()
            if not 2 <= len(query) <= 100:
                raise ValueError('Query length must be 2..100')
            browser = self.application().browser
            if not hasattr(browser, 'plugins'):
                raise RuntimeError('This Live version does not expose browser.plugins')
            self.busy = True
            state = {'queue': collections.deque([(browser.plugins, ['plugins'], 0)]),
                     'seen': set(), 'matches': [], 'count': 0, 'started': time.monotonic(), 'query': query}
            self.schedule_message(1, lambda: self.search_step(req, address, state))
            return None
        if op == 'load':
            return self.load(req, address)
        raise ValueError('Unknown browser operation')

    def search_step(self, req, address, state):
        if not self.running:
            return
        try:
            began = time.monotonic()
            for _ in range(60):
                if not state['queue'] or time.monotonic() - began > 0.015:
                    break
                item, names, depth = state['queue'].popleft()
                uri = str(item.uri)
                identity = uri or '/'.join(names)
                if identity in state['seen']:
                    continue
                state['seen'].add(identity)
                state['count'] += 1
                loadable = bool(item.is_loadable)
                if loadable and state['query'] in str(item.name).lower():
                    key = str(uuid.uuid4())
                    self.items[key] = item
                    state['matches'].append({'itemId': key, 'name': item.name, 'path': names, 'uri': uri})
                if not loadable and depth < 12:
                    for child in item.children:
                        state['queue'].append((child, names + [str(child.name)], depth + 1))
            limited = state['count'] >= 15000 or len(state['matches']) >= 40 or time.monotonic() - state['started'] > 20
            if state['queue'] and not limited:
                self.schedule_message(1, lambda: self.search_step(req, address, state))
                return
            self.busy = False
            self.send(address, req['id'], result={'session': self.session, 'matches': state['matches'],
                      'visited': state['count'], 'truncated': bool(state['queue']),
                      'elapsedMs': round((time.monotonic() - state['started']) * 1000)})
        except Exception as e:
            self.busy = False
            self.send(address, req['id'], error=str(e))

    def load(self, req, address):
        if req.get('expectedSession') != self.session:
            raise RuntimeError('Remote session changed; read status again')
        song = self.song()
        if song.is_playing or song.record_mode or song.session_record:
            raise RuntimeError('Stop playback and recording before insertion')
        target = self.targets.get(req.get('targetId'))
        if target is None or target not in self.tracks():
            raise RuntimeError('Track is no longer in this Set; read status again')
        if target.name != req.get('expectedName') or self.signature(target) != req.get('expectedFingerprint'):
            raise RuntimeError('Target name or device chain changed; read status again')
        if not target.has_audio_output or target.is_frozen:
            raise RuntimeError('Target must have audio output and not be frozen')
        item = self.items.get(req.get('itemId'))
        if item is None or not item.is_loadable:
            raise RuntimeError('Search again for the plugin')
        # No product allowlist. The exact searched BrowserItem is loaded below.
        requested_name = str(item.name)
        browser = self.application().browser
        if browser.hotswap_target is not None:
            raise RuntimeError('Exit browser hot-swap mode before inserting')
        before = list(target.devices)
        saved_track = song.view.selected_track
        saved_device = saved_track.view.selected_device
        mode = target.view.device_insert_mode
        song.view.selected_track = target
        if before:
            song.view.select_device(before[-1])
        target.view.device_insert_mode = Live.Track.DeviceInsertMode.selected_right
        self.busy = True
        self.receipts[req['id']] = {'error': 'Insertion started; outcome pending, inspect before retry'}
        while len(self.receipts) > 128:
            self.receipts.popitem(last=False)
        def restore_view():
            try:
                target.view.device_insert_mode = mode
                if song.view.selected_track == target and saved_track in self.tracks():
                    song.view.selected_track = saved_track
                    if saved_device:
                        song.view.select_device(saved_device)
            except Exception:
                pass

        try:
            browser.load_item(item)
        except Exception as e:
            self.busy = False
            restore_view()
            error = 'Plugin load failed: {}; partial insertion may remain; inspect before retry'.format(e)
            self.receipts[req['id']] = {'error': error}
            self.send(address, req['id'], error=error)
            return None

        def verify():
            try:
                if target not in self.tracks() or req.get('expectedSession') != self.session:
                    raise RuntimeError('Target or session changed during insertion; inspect before retry')
                after = list(target.devices)
                if len(after) != len(before) + 1 or after[:-1] != before:
                    raise RuntimeError('Unexpected insertion result; inspect chain; do not retry blindly')
                device = after[-1]
                def normalized(name):
                    return ''.join(c for c in str(name).casefold() if c.isalnum())
                actual_names = [device.name, getattr(device, 'class_display_name', '')]
                if normalized(requested_name) not in [normalized(n) for n in actual_names]:
                    raise RuntimeError('Inserted device name differs from searched item: {} -> {}; inspect before retry'.format(requested_name, device.name))
                result = {'verified': True, 'track': target.name, 'targetId': req['targetId'],
                          'requestedName': requested_name, 'itemId': req['itemId'],
                          'insertedName': device.name, 'insertedDeviceId': str(device._live_ptr),
                          'index': len(before), 'fingerprint': self.signature(target)}
                self.receipts[req['id']] = {'result': result}
                self.send(address, req['id'], result=result)
            except Exception as e:
                self.receipts[req['id']] = {'error': str(e)}
                self.send(address, req['id'], error=str(e))
            finally:
                self.busy = False
                restore_view()
        self.schedule_message(5, verify)
        return None

    # Remote Script envelope API is not the Max Live Object Model API.
    # Every Live object is resolved from the current Set, never from an arbitrary pointer.
    def automation_parameters(self, track):
        result = []
        def add(p, label):
            if p is not None and all(str(x[0]._live_ptr) != str(p._live_ptr) for x in result):
                result.append((p, label))
        mixer = track.mixer_device
        for key in ('volume', 'panning'):
            add(getattr(mixer, key, None), 'mixer/' + key)
        # Live raises RuntimeError on master-only properties of normal tracks.
        if track == self.song().master_track:
            for key in ('crossfader', 'song_tempo'):
                add(getattr(mixer, key, None), 'mixer/' + key)
        for i, p in enumerate(mixer.sends):
            add(p, 'send/' + str(i))
        def devices(items, prefix, depth=0):
            if depth > 16:
                raise RuntimeError('Rack nesting exceeds limit')
            for d in items:
                for p in d.parameters:
                    add(p, prefix + d.name + '/' + p.name)
                for c in getattr(d, 'chains', []):
                    devices(c.devices, prefix + d.name + '/' + c.name + '/', depth + 1)
        devices(track.devices, '')
        return result

    def automation_track(self, key):
        for t in self.tracks():
            if str(t._live_ptr) == key:
                return t
        raise RuntimeError('Track no longer exists; rediscover targets')

    def automation_clips(self, track):
        return [s.clip for s in getattr(track, 'clip_slots', []) if s.has_clip]

    def automation_resolve(self, req):
        t = self.automation_track(req['targetId'])
        clips = [c for c in self.automation_clips(t) if str(c._live_ptr) == req['clipId']]
        params = [p for p, _ in self.automation_parameters(t) if str(p._live_ptr) == req['parameterId']]
        if len(clips) != 1 or len(params) != 1:
            raise RuntimeError('Clip/parameter no longer belongs to target; rediscover')
        c, p = clips[0], params[0]
        # Membership in track.clip_slots above establishes Session ownership.
        # Remote Script Clip has no is_session_clip property in Live 11.
        if getattr(c, 'is_audio_clip', False) and not c.warping:
            raise RuntimeError('Unwarped audio uses seconds; beat automation unavailable')
        for method in ('automation_envelope', 'create_automation_envelope', 'clear_envelope'):
            if not callable(getattr(c, method, None)):
                raise RuntimeError('This Live version does not expose ' + method)
        return t, c, p

    def automation_number(self, value):
        import math
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Expected finite number')
        return float(value)

    def automation_sample(self, req):
        t, c, p = self.automation_resolve(req)
        start, end = self.automation_number(req['startBeat']), self.automation_number(req['endBeat'])
        count = req['sampleCount']
        if type(count) is not int or not 2 <= count <= 256 or not 0 <= start < end <= 1576800:
            raise ValueError('Invalid sample range/count')
        env = c.automation_envelope(p)
        values = []
        if env is not None:
            for i in range(count):
                time_at = start + (end - start) * i / (count - 1)
                values.append({'beat': time_at, 'value': self.automation_number(env.value_at_time(time_at))})
        state = {'exists': env is not None, 'samples': values, 'clipName': c.name,
                 'loopStart': c.loop_start, 'loopEnd': c.loop_end,
                 'startMarker': c.start_marker, 'endMarker': c.end_marker,
                 'looping': bool(c.looping), 'parameterName': p.name,
                 'min': p.min, 'max': p.max, 'quantized': bool(p.is_quantized)}
        state['fingerprint'] = hashlib.sha256(json.dumps(state, sort_keys=True).encode('utf8')).hexdigest()
        return state

    def automation(self, req):
        op = req['op']
        if not hasattr(self, 'automation_reads'):
            self.automation_reads = collections.OrderedDict()
        if op == 'automation_capabilities':
            def describe(obj, words):
                result = {}
                for name in dir(obj):
                    if name.startswith('_') or 'listener' in name or not any(w in name.lower() for w in words):
                        continue
                    try:
                        value = getattr(obj, name)
                        result[name] = (getattr(value, '__doc__', '') or '')[:1200] if callable(value) else type(value).__name__
                    except Exception as error:
                        result[name] = 'unavailable: ' + str(error)
                return result
            song = self.song()
            track = next(iter(song.tracks), song.master_track)
            parameter = track.mixer_device.volume
            clips = self.automation_clips(track)
            envelope = clips[0].automation_envelope(parameter) if clips else None
            return {'session': self.session, 'readOnly': True, 'recordingEnvironment': self.record_environment(song),
                    'song': describe(song, ('automation', 'record', 'punch', 'save', 'file', 'path')),
                    'track': describe(track, ('envelope', 'automation', 'arrangement')),
                    'parameter': describe(parameter, ('gesture', 'automation', 'envelope')),
                    'clip': describe(clips[0], ('automation', 'envelope')) if clips else {},
                    'envelope': describe(envelope, ('event', 'step', 'value', 'point')) if envelope is not None else {},
                    'envelopeTypes': [x for x in dir(Live) if 'envelope' in x.lower()]}
        if op == 'automation_targets':
            t = self.automation_track(req['targetId'])
            return {'session': self.session, 'targetId': req['targetId'],
                    'capabilities': {'sessionEnvelope': 'experimental', 'originalBreakpoints': False,
                                     'arrangementEnvelope': False, 'tempoEnvelope': False},
                    'clips': [{'clipId': str(c._live_ptr), 'name': c.name,
                               'loopStart': c.loop_start, 'loopEnd': c.loop_end,
                               'apiAvailable': callable(getattr(c, 'create_automation_envelope', None))}
                              for c in self.automation_clips(t)],
                    'parameters': [{'parameterId': str(p._live_ptr), 'name': label, 'min': p.min,
                                    'max': p.max, 'value': p.value, 'enabled': bool(p.is_enabled),
                                    'quantized': bool(p.is_quantized), 'automationState': int(p.automation_state)}
                                   for p, label in self.automation_parameters(t)]}
        if op == 'automation_read':
            state = self.automation_sample(req)
            key = str(uuid.uuid4())
            self.automation_reads[key] = (dict(req), state, time.monotonic(), self.song(), self.automation_resolve(req))
            while len(self.automation_reads) > 64:
                self.automation_reads.popitem(last=False)
            return dict(state, session=self.session, readToken=key, samplingOnly=True,
                        warning='Samples are not original breakpoints or a lossless backup; edits between samples cannot be detected.')
        if op not in ('automation_write', 'automation_clear'):
            raise ValueError('Unknown automation operation')
        if req.get('expectedSession') != self.session:
            raise RuntimeError('Remote session changed; read again')
        saved = self.automation_reads.get(req.get('readToken'))
        if saved is None or time.monotonic() - saved[2] > 60:
            raise RuntimeError('Read token missing/expired (60 seconds); read again')
        source, before, _, saved_song, saved_objects = saved
        song = self.song()
        if song != saved_song:
            raise RuntimeError('Live Set changed; read again')
        if song.is_playing or song.record_mode or song.session_record:
            raise RuntimeError('Stop playback and recording before automation edits')
        t, c, p = self.automation_resolve(source)
        if (t, c, p) != saved_objects:
            raise RuntimeError('Live objects changed; read again')
        if t.is_frozen or not p.is_enabled or getattr(c, 'is_recording', False):
            raise RuntimeError('Frozen track, disabled parameter or recording clip')
        if self.automation_sample(source)['fingerprint'] != before['fingerprint']:
            raise RuntimeError('Sampled envelope or clip changed; read again')
        steps = []
        if op == 'automation_write':
            points = req.get('points', [])
            shape, resolution = req.get('shape'), req.get('resolution')
            if shape not in ('step', 'linear') or type(resolution) is not int or not 1 <= resolution <= 256 or not 2 <= len(points) <= 128:
                raise ValueError('Invalid curve shape/resolution/points')
            points = [(self.automation_number(x['beat']), self.automation_number(x['value'])) for x in points]
            for at, value in points:
                if not source['startBeat'] <= at <= source['endBeat'] or not p.min <= value <= p.max:
                    raise ValueError('Point outside read range or parameter range')
                if p.is_quantized and value != round(value):
                    raise ValueError('Quantized parameters require integer values')
            if shape == 'linear' and p.is_quantized:
                raise ValueError('Quantized parameters require step curves')
            for (a, va), (b, vb) in zip(points, points[1:]):
                if b <= a:
                    raise ValueError('Points must be strictly increasing')
                n = resolution if shape == 'linear' else 1
                for i in range(n):
                    steps.append((a + (b-a)*i/n, (b-a)/n, va + (vb-va)*i/n if shape == 'linear' else va))
            if len(steps) > 512:
                raise ValueError('Curve exceeds 512 steps; reduce resolution')
            # Final point defines the end boundary; no write past that boundary.
        del self.automation_reads[req['readToken']]
        self.receipts[req['id']] = {'error': 'Automation edit started; inspect before retry'}
        while len(self.receipts) > 128:
            self.receipts.popitem(last=False)
        completed = 0
        song.begin_undo_step()
        try:
            if op == 'automation_clear':
                c.clear_envelope(p)
                if c.automation_envelope(p) is not None:
                    raise RuntimeError('Envelope deletion readback failed')
            else:
                env = c.automation_envelope(p)
                if env is None:
                    env = c.create_automation_envelope(p)
                if env is None or not callable(getattr(env, 'insert_step', None)):
                    raise RuntimeError('Envelope insertion unavailable')
                for at, duration, value in steps:
                    env.insert_step(at, duration, value)
                    completed += 1
                for at, duration, value in steps:
                    actual = env.value_at_time(at + duration * 0.5)
                    if abs(actual - value) > max(1e-5, abs(p.max-p.min)*1e-5):
                        raise RuntimeError('Envelope sample readback mismatch')
            result = {'verified': True, 'verification': 'step-midpoint-samples' if steps else 'envelope-absence',
                      'completedSteps': completed, 'session': self.session,
                      'before': before, 'after': self.automation_sample(source),
                      'warning': 'Looped clip edits affect every repetition. Original breakpoints are not preserved as a backup.'}
            self.receipts[req['id']] = {'result': result}
            return result
        except Exception as e:
            error = 'Automation failed after {} steps: {}; partial edits may remain. Inspect before retry.'.format(completed, e)
            self.receipts[req['id']] = {'error': error}
            raise RuntimeError(error)
        finally:
            song.end_undo_step()
    # Bounded real-time Arrangement recording. No arbitrary Python execution.
    def record_environment(self, song):
        return {'playing': bool(song.is_playing), 'recording': bool(song.record_mode),
                'sessionRecord': bool(song.session_record), 'loop': bool(song.loop),
                'punchIn': bool(song.punch_in), 'punchOut': bool(song.punch_out),
                'backToArranger': bool(song.back_to_arranger),
                'countIn': int(song.count_in_duration),
                'link': bool(getattr(song, 'is_ableton_link_enabled', False)),
                'armed': [str(t._live_ptr) for t in song.tracks if t.can_be_armed and t.arm],
                'sessionClips': [str(t._live_ptr) for t in song.tracks if t.playing_slot_index >= 0],
                'tracks': [str(t._live_ptr) for t in self.tracks()]}

    def record_preflight(self, song, track, parameter):
        e = self.record_environment(song)
        if any(e[k] for k in ('playing', 'recording', 'sessionRecord', 'loop', 'punchIn', 'punchOut', 'backToArranger', 'countIn', 'link', 'armed', 'sessionClips')):
            raise RuntimeError('Recording preflight blocked: '+json.dumps(e, sort_keys=True))
        if getattr(track, 'is_frozen', False) or not parameter.is_enabled:
            raise RuntimeError('Frozen track or disabled parameter')
        if not all(callable(getattr(parameter, k, None)) for k in ('begin_gesture', 'end_gesture', 're_enable_automation')):
            raise RuntimeError('Parameter gesture API unavailable')
        return e

    def recording_operation(self, req):
        op = req['op']
        if not hasattr(self, 'record_plans'):
            self.record_plans = collections.OrderedDict()
            self.record_runs = collections.OrderedDict()
            self.recording = None
        if op in ('automation_record_status', 'automation_record_stop'):
            if req.get('expectedSession') != self.session:
                raise RuntimeError('Remote session changed')
            run = self.record_runs.get(req['operationId'])
            if run is None:
                raise RuntimeError('Unknown recording operation')
            if op == 'automation_record_stop' and run['public']['state'] == 'recording':
                self.finish_recording(run, 'cancelled', 'Stopped by client; partial automation may remain')
            return dict(run['public'])
        if self.recording is not None:
            raise RuntimeError('Recording already active; inspect or stop it')
        song = self.song()
        if op == 'automation_record_prepare':
            t = self.automation_track(req['targetId'])
            p = next((p for p, _ in self.automation_parameters(t) if str(p._live_ptr) == req['parameterId']), None)
            if p is None:
                raise RuntimeError('Parameter does not belong to track')
            env = self.record_preflight(song, t, p)
            if p.automation_state and req.get('overwriteAutomation') != 1:
                raise RuntimeError('Existing automation requires explicit overwriteAutomation=1 and a saved backup')
            points = [(self.automation_number(x['beat']), self.automation_number(x['value'])) for x in req['points']]
            if not 2 <= len(points) <= 128 or not 0 <= points[0][0] < points[-1][0] <= 1576800 or points[-1][0]-points[0][0] > 64:
                raise ValueError('Use 2..128 points over at most 64 beats')
            if any(b <= a for (a, _), (b, _) in zip(points, points[1:])):
                raise ValueError('Points must be increasing')
            if p.is_quantized:
                raise ValueError('Real-time linear recording requires a continuous parameter')
            if any(not p.min <= v <= p.max for _, v in points):
                raise ValueError('Value outside parameter bounds')
            maximum = self.automation_number(req['maxSeconds'])
            if not 1 <= maximum <= 120:
                raise ValueError('maxSeconds must be 1..120')
            token = str(uuid.uuid4())
            self.record_plans[token] = dict(song=song, track=t, parameter=p, environment=env, points=points,
                                            value=p.value, automation=int(p.automation_state), born=time.monotonic(), maximum=maximum,
                                            position=song.current_song_time)
            while len(self.record_plans) > 16:
                self.record_plans.popitem(last=False)
            return {'prepareToken': token, 'session': self.session, 'prepared': True, 'started': False,
                    'startBeat': points[0][0], 'endBeat': points[-1][0], 'parameter': p.name,
                    'warning': 'Starts playback and Arrangement recording. Timing is scheduler-limited; existing lane data can be overwritten. Save a Set backup first. No audio/MIDI tracks may be armed.'}
        if op != 'automation_record_start' or req.get('expectedSession') != self.session:
            raise RuntimeError('Invalid recording operation or remote session')
        plan = self.record_plans.get(req['prepareToken'])
        if plan is None or time.monotonic()-plan['born'] > 60:
            raise RuntimeError('Recording plan expired; prepare again')
        p, t = plan['parameter'], plan['track']
        if song != plan['song'] or self.record_preflight(song, t, p) != plan['environment'] or p.value != plan['value'] or int(p.automation_state) != plan['automation'] or song.current_song_time != plan['position']:
            raise RuntimeError('Live changed since preparation')
        del self.record_plans[req['prepareToken']]
        rid = str(uuid.uuid4())
        run = dict(plan, public={'operationId':rid, 'session':self.session, 'state':'recording', 'verified':False,
                                'verification':'not-yet-verified', 'writtenSamples':0},
                   started=time.monotonic(), lastBeat=plan['points'][0][0], gesture=False,
                   oldAutomationArm=bool(song.session_automation_record))
        self.record_runs[rid] = run
        while len(self.record_runs) > 16:
            self.record_runs.popitem(last=False)
        self.recording = run
        self.receipts[req['id']] = {'result':dict(run['public'])}
        while len(self.receipts) > 128:
            self.receipts.popitem(last=False)
        try:
            song.current_song_time = plan['points'][0][0]
            song.session_automation_record = True
            song.record_mode = True
            p.begin_gesture()
            run['gesture'] = True
            p.value = plan['points'][0][1]
            song.start_playing()
            self.schedule_message(1, lambda: self.record_tick(run))
        except Exception as error:
            self.finish_recording(run, 'failed', str(error))
        return dict(run['public'])

    def record_tick(self, run):
        if self.recording is not run:
            return
        try:
            s, p = run['song'], run['parameter']
            if self.song() != s:
                raise RuntimeError('Live Set changed')
            if time.monotonic()-run['started'] > run['maximum']:
                raise RuntimeError('Recording wall-clock limit reached')
            e = self.record_environment(s)
            if not s.is_playing or not s.record_mode or not s.session_automation_record:
                raise RuntimeError('Transport or automation arm changed')
            if e['armed'] or e['sessionClips'] or e['loop'] or e['punchIn'] or e['punchOut'] or e['backToArranger'] or e['link'] or e['tracks'] != run['environment']['tracks'] or not p.is_enabled or getattr(run['track'], 'is_frozen', False):
                raise RuntimeError('Recording environment changed')
            beat = float(s.current_song_time)
            if beat < run['lastBeat'] or beat-run['lastBeat'] > 2:
                raise RuntimeError('Playhead jumped; recording stopped')
            points = run['points']
            if beat >= points[-1][0]:
                self.finish_recording(run, 'completed', 'Real-time recording finished; inspect the saved lane before claiming curve accuracy')
                return
            for (a, va), (b, vb) in zip(points, points[1:]):
                if a <= beat < b:
                    p.value = va + (vb-va)*(beat-a)/(b-a)
                    break
            run['lastBeat'] = beat
            run['public']['lastBeat'] = beat
            run['public']['writtenSamples'] += 1
            self.schedule_message(1, lambda: self.record_tick(run))
        except Exception as error:
            self.finish_recording(run, 'failed', str(error))

    def finish_recording(self, run, state, message):
        errors = []
        s, p = run['song'], run['parameter']
        # Always try each cleanup step, even when a previous one fails.
        actions = [('record off', lambda: setattr(s, 'record_mode', False)), ('stop', s.stop_playing)]
        if run['gesture']:
            actions.append(('end gesture', p.end_gesture))
        actions += [('automation arm', lambda: setattr(s, 'session_automation_record', run['oldAutomationArm'])),
                    ('re-enable lane', p.re_enable_automation),
                    ('position', lambda: setattr(s, 'current_song_time', run['position']))]
        for label, action in actions:
            try:
                action()
            except Exception as error:
                errors.append(label+': '+str(error))
        self.recording = None
        run['public'].update(state='failed' if errors else state, message=message, cleanupErrors=errors,
                             verified=False, verification='transport-cleanup-only',
                             warning='Recorded breakpoints and timing are not read back by this API. Inspect or save/read the Set; failures can leave partial automation.')
