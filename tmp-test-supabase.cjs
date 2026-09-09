require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { count, error } = await supabase
    .from('media_catalog')
    .select('*', { count: 'exact', head: true });
  if (error) { console.error('COUNT ERROR:', error.message); process.exit(1); }
  console.log('CATALOG_COUNT:', count);
  if (count !== null) {
    const { data: bt } = await supabase
      .from('media_catalog')
      .select('media_type')
      .eq('media_type', 'anime');
    console.log('ANIME:', bt?.length || 0);
    const { data: mg } = await supabase
      .from('media_catalog')
      .select('media_type')
      .in('media_type', ['manga','manhwa','manhua','novel']);
    console.log('MANGA/etc:', mg?.length || 0);
  }
  const { data: buckets, error: eb } = await supabase.storage.listBuckets();
  if (error) console.error('BUCKETS ERROR:', eb.message);
  console.log('BUCKETS:', (buckets || []).map(b => b.name));
  const hasAvatars = buckets?.some(b => b.name === 'avatars');
  console.log('AVATARS_BUCKET_EXISTS:', hasAvatars);
})().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
