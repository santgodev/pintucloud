const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const mapped = data.map(item => ({
    name: item.nombre,
    grupo: item.grupo,
    orden: item.orden ?? 9999
}));

mapped.sort((a,b) => a.orden - b.orden);

console.log('--- LOGS REALES ANTES DE AGRUPAR ---');
mapped.forEach(item => {
    console.log({ nombre: item.name, grupo: item.grupo, orden: item.orden });
});

const grouped = mapped.reduce((acc, item) => {
    const key = item.grupo || item.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
}, {});

const limited = Object.values(grouped).flatMap(group => group.slice(0, 3));
console.log('\n--- RESULTADO LIMITE 3 ---');
limited.forEach(item => {
    console.log({ nombre: item.name, grupo: item.grupo, orden: item.orden });
});
