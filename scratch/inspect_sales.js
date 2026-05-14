
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ucyeyuvrolmqvdanvfzu.supabase.co';
const supabaseKey = 'sb_publishable_-t5ivewFUhB6Qgwom9k2AA_utfSUa0r';

async function inspectSales() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
        .from('ventas')
        .select('id, numero_factura, tipo_documento, observaciones, estado')
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

inspectSales();
