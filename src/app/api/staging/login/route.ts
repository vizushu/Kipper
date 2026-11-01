import {stagingLogin} from '@/lib/staging-login';
export const runtime='nodejs';
export async function POST(req:Request){return stagingLogin(req);}
