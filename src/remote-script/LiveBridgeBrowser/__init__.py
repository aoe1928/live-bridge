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
        self.log_message('LiveBridgeBrowser 0.2 ready on loopback')

    def disconnect(self):
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
        if op == 'status':
            browser = self.application().browser
            return {'version': '0.2.0', 'session': self.session, 'playing': self.song().is_playing,
                    'capabilities': {'pluginInsertion': 'any_searched_plugin'},
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
