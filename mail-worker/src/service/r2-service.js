import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';

// Optional MULTI_R2_CONFIG is a Worker SECRET containing JSON:
// {"write":"primary","buckets":[{"id":"primary","bucket":"...","endpoint":"https://ACCOUNT.r2.cloudflarestorage.com","accessKeyId":"...","secretAccessKey":"..."}]}
// Do not store this value in the source code, GitHub variables or a Release ZIP.
const config = (env) => {
  if (!env.MULTI_R2_CONFIG) return null;
  let data;
  try { data = JSON.parse(env.MULTI_R2_CONFIG); } catch { throw new Error('Invalid MULTI_R2_CONFIG JSON'); }
  if (!Array.isArray(data.buckets) || !data.buckets.length || !data.write) throw new Error('Invalid MULTI_R2_CONFIG schema');
  if (new Set(data.buckets.map(b => b.id)).size !== data.buckets.length) throw new Error('Duplicate R2 storage IDs');
  for (const b of data.buckets) {
    if (!b.id || !b.bucket || !/^https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/?$/.test(b.endpoint || '') || !b.accessKeyId || !b.secretAccessKey) throw new Error('Invalid R2 storage entry');
  }
  if (!data.buckets.some(b => b.id === data.write)) throw new Error('R2 write storage not configured');
  return data;
};
const client = b => new S3Client({region:'auto',endpoint:b.endpoint,forcePathStyle:true,credentials:{accessKeyId:b.accessKeyId,secretAccessKey:b.secretAccessKey}});
const missing = e => e?.$metadata?.httpStatusCode === 404 || ['NoSuchKey','NotFound','NoSuchBucket'].includes(e?.name || e?.Code || e?.code);
const headers = (obj) => {
  const h = new Headers();
  h.set('Content-Type',obj.ContentType || obj.httpMetadata?.contentType || 'application/octet-stream');
  if (obj.ContentDisposition || obj.httpMetadata?.contentDisposition) h.set('Content-Disposition',obj.ContentDisposition || obj.httpMetadata?.contentDisposition);
  if (obj.CacheControl || obj.httpMetadata?.cacheControl) h.set('Cache-Control',obj.CacheControl || obj.httpMetadata?.cacheControl);
  return h;
};
const legacyType = async c => {
  const {bucket,endpoint,s3AccessKey,s3SecretKey}=await settingService.query(c);
  if (bucket && endpoint && s3AccessKey && s3SecretKey) return 'S3';
  return c.env.r2 ? 'R2' : 'KV';
};
const legacyGet = async (c,key,type) => {
  if (type==='S3') return s3Service.getObj(c,key);
  if (type==='R2') {const o=await c.env.r2.get(key); return o ? new Response(o.body,{headers:headers(o)}) : null;}
  return kvObjService.getObj(c,key);
};
const r2Service = {
  async storageType(c) {return config(c.env) ? 'MULTI_R2' : legacyType(c);},
  async putObj(c,key,content,metadata={}) {
    const cfg=config(c.env);
    if (cfg) {
      const b=cfg.buckets.find(b=>b.id===cfg.write);
      await client(b).send(new PutObjectCommand({Bucket:b.bucket,Key:key,Body:content,ContentType:metadata.contentType,ContentDisposition:metadata.contentDisposition,CacheControl:metadata.cacheControl}));
      return;
    }
    const type=await legacyType(c);
    if(type==='S3') return s3Service.putObj(c,key,content,metadata);
    if(type==='R2') return c.env.r2.put(key,content,{httpMetadata:{...metadata}});
    return kvObjService.putObj(c,key,content,metadata);
  },
  async getObj(c,key) {
    const cfg=config(c.env);
    if (cfg) {
      // Search new stores then all original storage backends. Never delete historical data on switch.
      for (const b of cfg.buckets) {
        try {
          const o=await client(b).send(new GetObjectCommand({Bucket:b.bucket,Key:key}));
          return new Response(o.Body,{headers:headers(o)});
        } catch(e) {if(!missing(e)) throw e;}
      }
      const ordered=['S3','R2','KV'];
      const {bucket,endpoint,s3AccessKey,s3SecretKey}=await settingService.query(c);
      for(const type of ordered) {
        if(type==='S3' && !(bucket && endpoint && s3AccessKey && s3SecretKey)) continue;
        if(type==='R2' && !c.env.r2) continue;
        if(type==='KV' && !c.env.kv) continue;
        try {const o=await legacyGet(c,key,type); if(o) return o;} catch(e) {if(!missing(e)) throw e;}
      }
      return null;
    }
    try {return await legacyGet(c,key,await legacyType(c));} catch(e) {if(missing(e)) return null;throw e;}
  },
  async toObjResp(c,key) {return this.getObj(c,key);},
  async delete(c,key) {
    // Deletion is intentionally disabled when multi-R2 is enabled.
    // This is a safe retention policy, not a migration or garbage collection routine.
    if(config(c.env)) return;
    const type=await legacyType(c);
    if(type==='S3') return s3Service.deleteObj(c,key);
    if(type==='R2') return c.env.r2.delete(key);
    return kvObjService.deleteObj(c,key);
  }
};
export default r2Service;
