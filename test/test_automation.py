import collections
import unittest
from test_browser import module, NS

class Envelope:
    def __init__(self): self.steps = []; self.fail = False
    def insert_step(self, at, duration, value):
        if self.fail: raise RuntimeError('insertion failed')
        self.steps.append((at,duration,value))
    def value_at_time(self, at):
        for start,duration,value in reversed(self.steps):
            if start <= at < start+duration: return value
        return 0.5

class AutomationTests(unittest.TestCase):
    def fixture(self):
        b=module.LiveBridgeBrowser.__new__(module.LiveBridgeBrowser)
        p=NS(_live_ptr=5,name='Volume',min=0,max=1,value=0.5,is_enabled=True,is_quantized=False,automation_state=0)
        c=NS(_live_ptr=4,name='Clip',loop_start=0,loop_end=4,start_marker=0,end_marker=4,looping=True,is_audio_clip=False,is_recording=False,env=None)
        c.automation_envelope=lambda p:c.env
        def create(p): c.env=Envelope();return c.env
        c.create_automation_envelope=create
        c.clear_envelope=lambda p:setattr(c,'env',None)
        t=NS(_live_ptr=3,devices=[],mixer_device=NS(volume=p,sends=[]),clip_slots=[NS(has_clip=True,clip=c)],is_frozen=False)
        song=NS(master_track=NS(),is_playing=False,record_mode=False,session_record=False,begin_undo_step=lambda:None,end_undo_step=lambda:None)
        b.song=lambda:song;b.tracks=lambda:[t];b.session='session';b.receipts=collections.OrderedDict()
        read=dict(op='automation_read',targetId='3',clipId='4',parameterId='5',startBeat=0,endBeat=4,sampleCount=9)
        state=b.automation(read)
        write=dict(op='automation_write',id='write',expectedSession='session',readToken=state['readToken'],points=[dict(beat=0,value=0),dict(beat=4,value=1)],shape='linear',resolution=8)
        return b,c,p,t,song,read,write
    def test_create_read_verify_clear(self):
        b,c,p,t,s,r,w=self.fixture()
        self.assertIsNone(c.env)
        result=b.automation(w)
        self.assertTrue(result['verified']);self.assertEqual(len(c.env.steps),8)
        read=b.automation(r);self.assertTrue(read['exists']);self.assertTrue(read['samplingOnly'])
        result=b.automation(dict(op='automation_clear',id='clear',expectedSession='session',readToken=read['readToken']))
        self.assertTrue(result['verified']);self.assertIsNone(c.env)
    def test_master_only_properties_not_read_on_regular_track(self):
        b,c,p,t,s,r,w=self.fixture()
        class Mixer:
            volume=p
            sends=[]
            @property
            def crossfader(self): raise RuntimeError('Only master has crossfader')
            @property
            def song_tempo(self): raise RuntimeError('Only master has song tempo')
        t.mixer_device=Mixer()
        result=b.automation(dict(op='automation_targets',targetId='3'))
        self.assertEqual([x['name'] for x in result['parameters']],['mixer/volume'])
        s.master_track=t
        t.mixer_device=NS(volume=p,sends=[],crossfader=NS(**dict(p.__dict__,_live_ptr=6)),song_tempo=NS(**dict(p.__dict__,_live_ptr=7)))
        self.assertEqual(len(b.automation_parameters(t)),3)
    def test_preflight_guards(self):
        changes=[lambda b,c,p,t,s,r,w:setattr(s,'is_playing',True),lambda b,c,p,t,s,r,w:setattr(t,'is_frozen',True),lambda b,c,p,t,s,r,w:w.update(expectedSession='old'),lambda b,c,p,t,s,r,w:w.update(points=[dict(beat=0,value=2),dict(beat=4,value=0)]),lambda b,c,p,t,s,r,w:w.update(points=[dict(beat=4,value=0),dict(beat=0,value=1)]),lambda b,c,p,t,s,r,w:setattr(p,'is_enabled',False),lambda b,c,p,t,s,r,w:setattr(c,'loop_end',8),lambda b,c,p,t,s,r,w:setattr(p,'is_quantized',True),lambda b,c,p,t,s,r,w:w.update(points=[dict(beat=0,value=float('nan')),dict(beat=4,value=1)])]
        for change in changes:
            args=self.fixture();change(*args)
            with self.assertRaises((ValueError,RuntimeError)): args[0].automation(args[-1])
            self.assertIsNone(args[1].env)
    def test_stale_curve_and_replay_rejected(self):
        b,c,p,t,s,r,w=self.fixture();c.env=Envelope()
        with self.assertRaises(RuntimeError): b.automation(w)
        w['readToken']=b.automation(r)['readToken'];b.automation(w)
        with self.assertRaises(RuntimeError): b.automation(w)
    def test_partial_failure_receipt(self):
        b,c,p,t,s,r,w=self.fixture();c.env=Envelope();c.env.fail=True
        w['readToken']=b.automation(r)['readToken']
        with self.assertRaisesRegex(RuntimeError,'partial edits'):b.automation(w)
        self.assertIn('error',b.receipts['write'])
    def test_bad_read_never_creates(self):
        b,c,p,t,s,r,w=self.fixture();r['endBeat']=0
        with self.assertRaises(ValueError):b.automation(r)
        self.assertIsNone(c.env)
    def test_live_set_switch_rejected(self):
        b,c,p,t,s,r,w=self.fixture();b.song=lambda:NS()
        with self.assertRaisesRegex(RuntimeError,'Set changed'):b.automation(w)
    def test_outside_range_not_cleared(self):
        b,c,p,t,s,r,w=self.fixture();c.env=Envelope();c.env.insert_step(8,2,0.75)
        w['readToken']=b.automation(r)['readToken'];b.automation(w)
        self.assertEqual(c.env.value_at_time(9),0.75)

if __name__=='__main__':unittest.main()
