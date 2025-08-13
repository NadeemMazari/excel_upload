
const fs = require('fs');
const pool= require('./../databaseConnection')
const path = require('path');
const copyFrom = require('pg-copy-streams').from;
require('dotenv').config();
// const pool = new Pool({ connectionString: 'postgres://postgres:mazari@localhost/taskdb' });




async function importCSV(filePath, tableName, headers) {
  console.log("Importing CSV...");

  const client = await pool.connect();

  try {
    // Remove the first header from the CSV (assumed "id" from file)
    // const importHeaders = headers.slice(1);

    // Wrap column names in quotes to handle spaces/special chars
    const quotedColumns = headers.map(h => `"${h}"`).join(', ');

    // COPY without the id column
    const copyQuery = `COPY "${tableName}" (${quotedColumns}) FROM STDIN WITH CSV HEADER`;

    const stream = client.query(copyFrom(copyQuery));
    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', (err) => {
      console.error('❌ File stream error:', err);
      client.release();
    });

    stream.on('error', (err) => {
      console.error('❌ COPY stream error:', err);
      client.release();
    });

    stream.on('finish', () => {
      console.log('✅ Import completed!');

      fs.unlink(filePath, (err) => {
        if (err) console.error('❌ File delete error:', err);
      });
      client.release();

      
    });

    fileStream.pipe(stream);

  } catch (err) {
    console.error('❌ Error importing:', err);
    client.release();
  }
}



 function unlink(filePath) {
  try {
  let resp=  fs.unlinkSync(filePath, (result)=>{
      console.log(result);
      
  })
    // console.log(resp);
    
  } catch (error) {
    console.log(error);
    
  }
}



// async function createTableIfNotExists(tableName, headers) {
//     // Check if table exists
//     const checkQuery = `
//         SELECT EXISTS (
//             SELECT FROM information_schema.tables 
//             WHERE table_schema = 'public' 
//             AND table_name = $1
//         )
//     `;
//     const { rows } = await pool.query(checkQuery, [tableName]);

//     if (!rows[0].exists) {
//         // Build CREATE TABLE query
//         const columns = headers.map(h => `"${h}" TEXT`).join(', ');
//         const createQuery = `CREATE TABLE "${tableName}" (${columns});`;
//         await pool.query(createQuery);
//         console.log(`✅ Table "${tableName}" created successfully`);
//     } else {
//         console.log(`ℹ️ Table "${tableName}" already exists`);
//     }
// }

async function createTableIfNotExists(tableName, headers, csvFilename) {

  console.log(headers);
  
    // Check if table exists
    const checkQuery = `
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        )
    `;
    const { rows } = await pool.query(checkQuery, [tableName]);

    if (!rows[0].exists) {
        // Build CREATE TABLE query with id SERIAL PRIMARY KEY
        const columns = headers.map(h => `"${h}" TEXT`).join(', ');
        const createQuery = `
            CREATE TABLE "${tableName}" (
                id SERIAL PRIMARY KEY,
                ${columns}
            );
        `;
        await pool.query(createQuery);
        console.log(`✅ Table "${tableName}" created successfully`);
    } else {
        console.log(`ℹ️ Table "${tableName}" already exists`);
    }

      await importCSV(path.join("uploads",csvFilename ), tableName , headers)
     
}


module.exports= {importCSV, unlink, createTableIfNotExists}