const fs = require('fs');
const path = require('path');
const readline = require('readline');

const datasetsDir = path.join(__dirname, 'datasets');
const frontendScriptsDir = path.join(__dirname, 'frontend', 'scripts');

// Ensure frontend/scripts exists
if (!fs.existsSync(frontendScriptsDir)) {
    fs.mkdirSync(frontendScriptsDir, { recursive: true });
}

const outputFile = path.join(frontendScriptsDir, 'data.js');

async function processCSV(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const data = [];
    let headers = [];
    let isFirstLine = true;

    for await (const line of rl) {
        // Handle CSV parsing for semicolon delimiter and quotes
        // Remove surrounding quotes and split by semicolon
        // We can do a simpler split if the data is consistently formatted
        const values = line.split(';').map(v => {
            let val = v.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            return val;
        });
        
        if (isFirstLine) {
            headers = values;
            isFirstLine = false;
        } else {
            const row = {};
            for (let i = 0; i < headers.length; i++) {
                row[headers[i]] = values[i] ? values[i].trim() : null;
            }
            data.push(row);
        }
    }
    return data;
}

async function main() {
    const files = fs.readdirSync(datasetsDir).filter(f => f.endsWith('.csv'));
    const allData = {};

    for (const file of files) {
        const tableName = path.basename(file, '.csv');
        const filePath = path.join(datasetsDir, file);
        allData[tableName] = await processCSV(filePath);
    }

    const fileContent = `// Automatically generated from CSV datasets\nconst mockData = ${JSON.stringify(allData, null, 2)};\n`;
    fs.writeFileSync(outputFile, fileContent);
    console.log('Successfully generated frontend/scripts/data.js');
}

main().catch(console.error);
