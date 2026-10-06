import unittest
from test_automation import AutomationTests
from test_browser import module

class RecordingTests(unittest.TestCase):
    def fixture(self):
        b,c,p,t,s,_,_=AutomationTests().fixture()
        for k,v in dict(loop=False,punch_in=False,punch_out=False,back_to_arranger=False,count_in_duration=0,is_ableton_link_enabled=False,current_song_time=10,session_automation_record=False,tracks=[t]).items():setattr(s,k,v)
        t.can_be_armed=True;t.arm=False;t.playing_slot_index=-1
        p.begin_gesture=lambda:setattr(p,'gesture',True)
        p.end_gesture=lambda:setattr(p,'gesture',False)
        p.re_enable_automation=lambda:None
        s.start_playing=lambda:setattr(s,'is_playing',True)
        s.stop_playing=lambda:setattr(s,'is_playing',False)
        b.schedule_message=lambda *a:None
        req=dict(op='automation_record_prepare',targetId='3',parameterId='5',points=[dict(beat=0,value=.2),dict(beat=4,value=.8)],maxSeconds=10,overwriteAutomation=0)
        return b,p,t,s,req
    def start(self,b,req):
        plan=b.recording_operation(req)
        return b.recording_operation(dict(op='automation_record_start',id='start',prepareToken=plan['prepareToken'],expectedSession='session'))
    def test_completion_and_restored_transport(self):
        b,p,t,s,req=self.fixture();result=self.start(b,req);run=b.recording
        for beat in (1,2,3,4):s.current_song_time=beat;b.record_tick(run)
        self.assertEqual(run['public']['state'],'completed');self.assertFalse(run['public']['verified'])
        self.assertFalse(s.record_mode);self.assertFalse(s.is_playing);self.assertFalse(p.gesture);self.assertEqual(s.current_song_time,10)
        self.assertFalse(s.session_automation_record);self.assertIsNone(b.recording)
    def test_preflight_has_no_mutations(self):
        for attr in ('loop','punch_in','punch_out','back_to_arranger','count_in_duration','is_ableton_link_enabled','is_playing','record_mode','session_record'):
            b,p,t,s,req=self.fixture();setattr(s,attr,True)
            with self.assertRaises(RuntimeError):b.recording_operation(req)
            self.assertEqual(p.value,.5)
        b,p,t,s,req=self.fixture();t.arm=True
        with self.assertRaises(RuntimeError):b.recording_operation(req)
    def test_changed_and_expired_plans(self):
        for change in ('time','value','expired'):
            b,p,t,s,req=self.fixture();plan=b.recording_operation(req)
            if change=='time':s.current_song_time=11
            if change=='value':p.value=.6
            if change=='expired':b.record_plans[plan['prepareToken']]['born']-=61
            with self.assertRaises(RuntimeError):b.recording_operation(dict(op='automation_record_start',id='start',prepareToken=plan['prepareToken'],expectedSession='session'))
            self.assertFalse(s.is_playing)
    def test_timeout_arm_change_jump_cleanup(self):
        for change in ('timeout','arm','jump','transport'):
            b,p,t,s,req=self.fixture();self.start(b,req);run=b.recording
            if change=='timeout':run['started']-=11
            if change=='arm':t.arm=True
            if change=='jump':s.current_song_time=3
            if change=='transport':s.is_playing=False
            b.record_tick(run)
            self.assertEqual(run['public']['state'],'failed');self.assertFalse(s.record_mode);self.assertFalse(p.gesture)
    def test_cancel_and_cleanup_failure(self):
        b,p,t,s,req=self.fixture();r=self.start(b,req)
        p.end_gesture=lambda:(_ for _ in ()).throw(RuntimeError('gesture failure'))
        r=b.recording_operation(dict(op='automation_record_stop',operationId=r['operationId'],expectedSession='session'))
        self.assertEqual(r['state'],'failed');self.assertTrue(r['cleanupErrors']);self.assertFalse(s.is_playing);self.assertFalse(s.session_automation_record);self.assertEqual(s.current_song_time,10)
    def test_consumed_plan_and_wrong_session(self):
        b,p,t,s,req=self.fixture();plan=b.recording_operation(req);a=dict(op='automation_record_start',id='start',prepareToken=plan['prepareToken'],expectedSession='wrong')
        with self.assertRaises(RuntimeError):b.recording_operation(a)
        a['expectedSession']='session';r=b.recording_operation(a)
        b.recording_operation(dict(op='automation_record_stop',operationId=r['operationId'],expectedSession='session'))
        with self.assertRaises(RuntimeError):b.recording_operation(a)
    def test_start_failure_stops_recording(self):
        b,p,t,s,req=self.fixture();s.start_playing=lambda:(_ for _ in ()).throw(RuntimeError('start failure'))
        r=self.start(b,req);self.assertEqual(r['state'],'failed');self.assertFalse(s.record_mode);self.assertFalse(p.gesture)

if __name__=='__main__':unittest.main()
