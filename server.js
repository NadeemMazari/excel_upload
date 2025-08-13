const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const app = express();
const PORT = 4000;
const csv = require('csv-parser');
const {importCSV, unlink, createTableIfNotExists}= require('./utils/services')
// Storage config for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // folder to store file
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // unique file name
    }
});

// File filter (only Excel)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only Excel files are allowed!'), false);
    }
};

const upload = multer({ storage, fileFilter });


app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Read Excel
        const workbook = XLSX.readFile(req.file.path);
     
        const requireSheetName= "RUNS"
        const sheetNames = workbook.SheetNames;
      
        if(!sheetNames.includes(requireSheetName)){
            res.json({
                sucess:false, 
                message:`No sheet name: ${requireSheetName} found. Please modify the name of sheet as ${requireSheetName} `
            })
            return 
        }
        

            
        const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[requireSheetName]);

        // Create CSV file path
        const csvFilename = Date.now() + '.csv';
        const csvPath = path.join('uploads', csvFilename);

        // Save CSV
        fs.writeFileSync(csvPath, csvData, 'utf8');

            const headers = [];

        // Read only the first row for headers
        const readStream = fs.createReadStream(csvPath)
            .pipe(csv())
            .on('headers', async (headerList) => {
                headers.push(...headerList);
               
                await createTableIfNotExists('MYDATA', headers, csvFilename);
            })

        console.log("deleting orignal file");
        fs.unlinkSync(req.file.path);
   

        res.json({
            message: 'Excel file converted to CSV and stored successfully',
            csvFile: csvFilename
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
