import {SqliteAdapter} from '../../src/lib/db/sqlite';
const [file,action]=process.argv.slice(2);const a=new SqliteAdapter(file);
process.stdout.write('READY\n');
process.stdin.once('data',async()=>{
 try {
  if(action==='import'){
   const lease=await a.beginCalendarSync('casa-pacifica','airbnb-primary');
   const result=await a.completeCalendarSync({propertyId:'casa-pacifica',sourceId:'airbnb-primary',leaseId:lease!.leaseId,events:[{uidHash:'a'.repeat(64),from:'2027-02-20',to:'2027-02-22'}],nowISO:new Date().toISOString()});
   process.stdout.write(JSON.stringify({imported:result.applied})+'\n');
  }else{
   try{await a.createBookingIfAvailable({propertyId:'casa-pacifica',checkIn:'2027-02-20',checkOut:'2027-02-22',nights:2,guests:{adults:2,children:0,infants:0},pets:0,guest:{name:'Synthetic',email:'synthetic@example.test'},lineItems:[],totalCents:10000,currency:'USD',idempotencyKey:'calendar-race'});process.stdout.write('HELD\n');}
   catch{process.stdout.write('UNAVAILABLE\n');}
  }
 }finally{a.close();process.exit(0);}
});
