const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const os = require('os');
const audioconcat = require('audioconcat');

const app = express();
// Increase the request size limit (adjust the limit based on your needs)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.resolve('./')));

app.post('/synthesize', async (req, res) => {
    const { arabicInput, library } = req.body;

    if (!arabicInput || !library) {
        return res.status(400).json({ error: 'Arabic input and library must be provided.' });
    }

    const audioLibraryPath = path.resolve(`./${library}`);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-concat-')); // Create a unique temporary directory
    const outputFileName = library === 'Audio Aziz' ? 'outputA.mp3' : 'outputB.mp3';
    const finalOutputPath = path.join(tempDir, outputFileName);

    try {
        const sanitizedInput = arabicInput
            .trim()
            .split(/\s+/)
            .filter(word => word.trim() !== '');

        if (sanitizedInput.length === 0) {
            return res.status(400).json({ error: 'Input does not contain valid words.' });
        }

        const chunks = [];
        let currentChunk = [];

        // Collect audio files for each word
        for (const word of sanitizedInput) {
            const filePath = path.join(audioLibraryPath, `${word}.mp3`);
            if (fs.existsSync(filePath)) {
                currentChunk.push(filePath);
            } else {
                console.warn(`Audio file not found for word: ${word}`);
            }

            if (currentChunk.length >= 300) {
                chunks.push([...currentChunk]);
                currentChunk = [];
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        const intermediateFiles = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const intermediateFileName = `intermediate_${i + 1}.mp3`;
            const intermediateFilePath = path.join(tempDir, intermediateFileName);

            await new Promise((resolve, reject) => {
                audioconcat(chunk)
                    .concat(intermediateFilePath)
                    .on('start', () => console.log(`Processing chunk ${i + 1}`))
                    .on('error', error => reject(error))
                    .on('end', () => {
                        console.log(`Intermediate file created: ${intermediateFileName}`);
                        intermediateFiles.push(intermediateFilePath);
                        resolve();
                    });
            });
        }

        if (intermediateFiles.length === 0) {
            fs.rmdirSync(tempDir, { recursive: true }); // Clean up the temp directory
            return res.status(404).json({ error: 'No valid audio files found to concatenate.' });
        }

        audioconcat(intermediateFiles)
            .concat(finalOutputPath)
            .on('start', () => console.log('Final concatenation started'))
            .on('error', error => {
                console.error('Error during final concatenation:', error);
                res.status(500).json({ error: 'Failed to generate final audio.' });
            })
            .on('end', () => {
                console.log('Final audio created successfully:', finalOutputPath);

                // Clean up intermediate files
                for (const file of intermediateFiles) {
                    fs.unlinkSync(file);
                }

                res.json({ success: true, output: `/temp/${path.basename(tempDir)}/${outputFileName}` });
            });
    } catch (error) {
        console.error('Unexpected error:', error);
        fs.rmdirSync(tempDir, { recursive: true }); // Clean up the temp directory
        res.status(500).json({ error: 'Unexpected error occurred.' });
    }
});

app.use('/temp', express.static(os.tmpdir())); // Serve temporary files

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
