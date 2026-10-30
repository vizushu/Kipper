import {describe,it,expect} from 'vitest';
import {previewCancellation} from '../src/lib/cancellation';
describe('versioned cancellation preview (LA 3pm cutoff)',()=>{
 it.each([
 ['2027-01-30T23:00:00Z',100],['2027-01-30T23:00:00.001Z',50],
 ['2027-02-14T23:00:00Z',50],['2027-02-14T23:00:01Z',0],
 ['2027-02-28T23:00:00Z',0],
 ])('%s receives %s percent accommodation refund',(timestamp,percent)=>expect(previewCancellation('2027-03-01',new Date(timestamp),100000,18000).accommodationPercent).toBe(percent));
 it('refunds cleaning before arrival but not at arrival',()=>{expect(previewCancellation('2027-03-01',new Date('2027-03-01T22:59:59Z'),100000,18000).cleaningRefundCents).toBe(18000);expect(previewCancellation('2027-03-01',new Date('2027-03-01T23:00:00Z'),100000,18000).cleaningRefundCents).toBe(0);});
 it('uses local-day boundaries through DST, not fixed 24-hour chunks',()=>expect(previewCancellation('2027-03-20',new Date('2027-02-18T23:00:00Z'),100000,18000).accommodationPercent).toBe(100));
 it('does not calculate or issue unverified tax refunds',()=>expect(previewCancellation('2027-03-01',new Date('2027-01-01T12:00:00Z'),100000,18000)).toMatchObject({taxAdjustment:'manual_review',previewOnly:true}));
});
