const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const CSV_FILENAME = path.resolve(__dirname, 'failed_domains.csv');
const outputFile = fs.createWriteStream(path.join(__dirname, 'results.txt'));
const BATCH_SIZE = 100;
const PAUSE_TIME = 10000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCategoryByScraping = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
      },
    });
    const $ = cheerio.load(data);
    const title = $('title').text().trim();
    console.log(`Title for ${url}: ${title}`);
    outputFile.write(`Title for ${url}: ${title}\n`);
  } catch (error) {
    const errorMessage = `Error fetching ${url}: ${error.message}`;
    console.error(errorMessage);
    outputFile.write(`${errorMessage}\n`);
  }
};

const processBatch = async (urls) => {
  await Promise.all(urls.map(getCategoryByScraping));
};

const scrapeUrlsFromCsv = async (csvFilePath) => {
  const urls = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      const url = row.url;
      if (url) {
        urls.push(url);
      } else {
        const noUrlMessage = `No URL found in row: ${JSON.stringify(row)}`;
        console.error(noUrlMessage);
        outputFile.write(`${noUrlMessage}\n`);
      }
    })
    .on('end', async () => {
      console.log('Finished processing CSV file.');

      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batch = urls.slice(i, i + BATCH_SIZE);
        await processBatch(batch);
        if (i + BATCH_SIZE < urls.length) {
          console.log(`Pausing for ${PAUSE_TIME / 1000} seconds...`);
          await delay(PAUSE_TIME);
        }
      }
      outputFile.end();
    })
    .on('error', (error) => {
      const readErrorMessage = `Error reading CSV file: ${error.message}`;
      console.error(readErrorMessage);
      outputFile.write(`${readErrorMessage}\n`);
    });
};

scrapeUrlsFromCsv(CSV_FILENAME);
