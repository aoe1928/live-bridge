import collections
import importlib.util
import pathlib
import sys
import types
import unittest

sys.modules['Live'] = types.SimpleNamespace(Track=types.SimpleNamespace(DeviceInsertMode=types.SimpleNamespace(selected_right=2)))
sys.modules['_Framework'] = types.ModuleType('_Framework')
sys.modules['_Framework.ControlSurface'] = types.SimpleNamespace(ControlSurface=object)
spec = importlib.util.spec_from_file_location('browser_test_module', pathlib.Path(__file__).resolve().parents[1] / 'src/remote-script/LiveBridgeBrowser/__init__.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NS = types.SimpleNamespace


def fixture(plugin='TR5 Space Delay', behavior='append'):
    bridge = module.LiveBridgeBrowser.__new__(module.LiveBridgeBrowser)
    original = NS(_live_ptr=1, name='EQ', class_name='PluginDevice')
    target = NS(_live_ptr=10, name='D-Guitar Delay', devices=[original], has_audio_output=True, is_frozen=False,
                view=NS(selected_device=original, device_insert_mode=0))
    saved = NS(_live_ptr=20, name='Other', devices=[], view=NS(selected_device=None))
    song = NS(tracks=[saved], return_tracks=[target], master_track=NS(_live_ptr=30, devices=[]), is_playing=False, record_mode=False, session_record=False)
    song.view = NS(selected_track=saved, select_device=lambda device: None)
    item = NS(name=plugin, is_loadable=True)
    browser = NS(hotswap_target=None)
    loaded = []

    def load(item):
        loaded.append(item)
        if behavior == 'throw':
            raise RuntimeError('Plugin failed')
        device = NS(_live_ptr=2, name=plugin if behavior != 'wrong' else 'Wrong plugin', class_name='PluginDevice', class_display_name=plugin if behavior != 'wrong' else 'Wrong')
        if behavior == 'replace':
            target.devices = [device]
        else:
            target.devices.append(device)

    browser.load_item = load
    bridge.session = 'remote-session'
    bridge.song = lambda: song
    bridge.application = lambda: NS(browser=browser)
    bridge.items = {'item': item}
    bridge.targets = {'10': target}
    bridge.receipts = collections.OrderedDict()
    bridge.busy = False
    bridge.running = True
    queue, replies = [], []
    bridge.schedule_message = lambda delay, fn: queue.append(fn)
    bridge.send = lambda address, rid, result=None, error=None: replies.append(NS(result=result, error=error))
    req = dict(id='request', expectedSession=bridge.session, targetId='10', expectedName=target.name,
               expectedFingerprint=bridge.signature(target), itemId='item')
    return NS(bridge=bridge, target=target, saved=saved, song=song, browser=browser, req=req, loaded=loaded, queue=queue, replies=replies)


class BrowserTests(unittest.TestCase):
    def test_arbitrary_plugins_are_not_blocked_by_product_name(self):
        for name in ['TR5 Space Delay', 'ValhallaVintageVerb', 'Pro-Q 4', 'L2 Stereo']:
            f = fixture(name)
            f.bridge.load(f.req, None)
            f.queue.pop(0)()
            self.assertTrue(f.replies[-1].result['verified'])
            self.assertEqual(f.replies[-1].result['requestedName'], name)
            self.assertEqual(f.target.devices[0].name, 'EQ')
            self.assertIs(f.song.view.selected_track, f.saved)
            self.assertEqual(f.target.view.device_insert_mode, 0)

    def test_existing_l2_does_not_block_another_product(self):
        f = fixture()
        f.target.devices[0].name = 'L2 Stereo'
        f.req['expectedFingerprint'] = f.bridge.signature(f.target)
        f.bridge.load(f.req, None)
        f.queue.pop(0)()
        self.assertTrue(f.replies[-1].result['verified'])

    def test_preflight_guards_do_not_call_loader(self):
        mutations = [lambda f: setattr(f.song, 'is_playing', True), lambda f: setattr(f.song, 'record_mode', True),
                     lambda f: setattr(f.song, 'session_record', True), lambda f: setattr(f.target, 'is_frozen', True),
                     lambda f: setattr(f.browser, 'hotswap_target', object()), lambda f: f.req.update(expectedSession='old'),
                     lambda f: f.req.update(expectedName='Other'), lambda f: f.req.update(expectedFingerprint='old'),
                     lambda f: f.req.update(itemId='missing')]
        for change in mutations:
            f = fixture()
            change(f)
            with self.assertRaises(RuntimeError):
                f.bridge.load(f.req, None)
            self.assertEqual(f.loaded, [])

    def test_wrong_identity_and_replacement_never_claim_success(self):
        for mode in ['wrong', 'replace']:
            f = fixture(behavior=mode)
            f.bridge.load(f.req, None)
            f.queue.pop(0)()
            self.assertIsNone(f.replies[-1].result)
            self.assertIsNotNone(f.replies[-1].error)
            self.assertFalse(f.bridge.busy)
            self.assertIs(f.song.view.selected_track, f.saved)

    def test_load_exception_restores_selection_and_keeps_failure_receipt(self):
        f = fixture(behavior='throw')
        f.bridge.load(f.req, None)
        self.assertIn('partial insertion', f.replies[-1].error)
        self.assertIn('error', f.bridge.receipts['request'])
        self.assertIs(f.song.view.selected_track, f.saved)
        self.assertEqual(f.target.view.device_insert_mode, 0)
        self.assertFalse(f.bridge.busy)

    def test_removed_target_cannot_verify(self):
        f = fixture()
        f.bridge.load(f.req, None)
        f.song.return_tracks = []
        f.queue.pop(0)()
        self.assertIn('Target or session changed', f.replies[-1].error)


if __name__ == '__main__':
    unittest.main()
