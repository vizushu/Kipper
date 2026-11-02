import {SqliteAdapter} from '../../src/lib/db/sqlite';
const [dbPath,key]=process.argv.slice(2);
const adapter=new SqliteAdapter(dbPath);
process.stdout.write('READY\n');
process.stdin.once('data',async()=>{
 try {const booking=await adapter.createBookingIfAvailable({propertyId:'casa-pacifica',checkIn:'2027-02-20',checkOut:'2027-02-22',nights:2,guests:{adults:2,children:0,infants:0},pets:0,guest:{name:'Synthetic Race',email:'race@example.test'},lineItems:[],totalCents:10000,currency:'USD',idempotencyKey:key});process.stdout.write(JSON.stringify({id:booking.id})+'\n');}
 catch(error){process.stdout.write(JSON.stringify({code:(error as {code?:string}).code})+'\n');}
 finally{adapter.close();process.exit(0);}
});
