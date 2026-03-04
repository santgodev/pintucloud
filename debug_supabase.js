const supabaseJs = require('@supabase/supabase-js');

const supabaseUrl = 'https://ucyeyuvrolmqvdanvfzu.supabase.co';
const supabaseKey = 'sb_publishable_-t5ivewFUhB6Qgwom9k2AA_utfSUa0r';

const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Fetching data from Supabase...');
    const { data, error } = await supabase
        .from('compras')
        .select('id, numero_factura, condicion_pago, dias_credito, fecha_vencimiento, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No purchase records found in the database.');
        return;
    }

    console.log('Latest Purchase Records (JSON Output):');
    console.log(JSON.stringify(data, null, 2));
}

checkData();
