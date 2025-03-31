import axios from 'axios';
import fs from 'fs';
import util from 'util';

const authorizationToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTY0MTg3NTMuNTMxNTkyLCJ1c2VyZW1haWwiOiJsYXZpY2sxMDBAZ21haWwuY29tIn0.hlJ2R0Q5KjDb2QBQdUtJfnAkF_BzWge4kAh8Txy9pwo';
const baseUrl = 'https://brain.predis.ai/igpost';
const jobDetails = {
    username: 'lavick100@gmail.com',
    job_id: '664bd5c1cd8d8af9545e23cf',
    event_id: '664bd5d4cd8d8af9545e23d9',
    output_format: 'json'
};
const outputFilePath = 'creatives.json';

const delay = util.promisify(setTimeout);

const getTemplateIds = async () => {
    const templateIds = [];
    const totalPages = 68;
    console.log('Starting to fetch template IDs...');
    for (let page = 0; page < totalPages; page++) {
        const startTime = Date.now();
        try {
            const response = await axios.get(`${baseUrl}/get_post_templates/`, {
                params: {
                    username: jobDetails.username,
                    job_id: jobDetails.job_id,
                    event_id: jobDetails.event_id,
                    page_n: page
                },
                headers: {
                    'Authorization': authorizationToken
                }
            });

            const data = response.data;
            if (data.message === 'OK') {
                const templates = data.data;
                templates.forEach(template => {
                    templateIds.push(template.template_id);
                });
                console.log(`Fetched page ${page + 1} of ${totalPages}`);
            } else {
                console.error(`Error fetching templates on page ${page}: ${data.message}`);
            }
        } catch (error) {
            console.error(`Error fetching templates on page ${page}: ${error.message}`);
        }
        const endTime = Date.now();
        const elapsed = endTime - startTime;
        const remainingTime = ((totalPages - (page + 1)) * elapsed) / 1000;
        console.log(`Estimated remaining time: ${remainingTime.toFixed(2)} seconds`);
    }
    return templateIds;
};

const getCreativeData = async (templateId, index, total) => {
    try {
        const startTime = Date.now();
        const bodyContent = `username=${jobDetails.username}&job_id=${jobDetails.job_id}&event_id=${jobDetails.event_id}&output_format=${jobDetails.output_format}&template_id=${templateId}`;

        const reqOptions = {
            url: `${baseUrl}/generateCreativeFromTemplate`,
            method: 'POST',
            headers: {
                'Accept': '*/*',
                'User-Agent': 'Thunder Client (https://www.thunderclient.com)',
                'Authorization': authorizationToken,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: bodyContent
        };

        const response = await axios.request(reqOptions);

        const data = response.data;
        if (data.message === 'OK') {
            console.log(`Generated creative for template ${index + 1} of ${total}`);
            return data.data;
        } else {
            console.error(`Error generating creative for template ${templateId}: ${response}`);
            return null;
        }
    } catch (error) {
        console.error(`Error generating creative for template ${templateId}: ${error}`);
        return null;
    }
};

const saveCreativesToFile = async (creatives) => {
    try {
        await fs.promises.writeFile(outputFilePath, JSON.stringify(creatives, null, 2));
        console.log(`Creatives saved to ${outputFilePath}`);
    } catch (error) {
        console.error(`Error saving creatives to file: ${error.message}`);
    }
};

const main = async () => {
    const templateIds = ["65dddce68970c98bc757b910"];// await getTemplateIds();
    const totalTemplates = templateIds.length;
    const creatives = [];

    console.log(`Total templates to process: ${totalTemplates}`);
    for (let i = 0; i < totalTemplates; i++) {
        const startTime = Date.now();
        const creativeData = await getCreativeData(templateIds[i], i, totalTemplates);
        if (creativeData) {
            creatives.push(creativeData);
        }
        const endTime = Date.now();
        const elapsed = endTime - startTime;
        const remainingTime = ((totalTemplates - (i + 1)) * elapsed) / 1000;
        console.log(`Estimated remaining time: ${remainingTime.toFixed(2)} seconds`);
        await delay(1000); // Delay for 1 second between API calls
    }

    await saveCreativesToFile(creatives);
};

main().catch(console.error);

var options = {
  method: 'POST',
  url: 'https://brain.predis.ai/igpost/generateCreativeFromTemplate',
  headers: {
    Accept: '*/*',
    // 'User-Agent': 'Thunder Client (https://www.thunderclient.com)',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTY0MTg3NTMuNTMxNTkyLCJ1c2VyZW1haWwiOiJsYXZpY2sxMDBAZ21haWwuY29tIn0.hlJ2R0Q5KjDb2QBQdUtJfnAkF_BzWge4kAh8Txy9pwo',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  data: {
    username: 'lavick100@gmail.com',
    job_id: '664bd5c1cd8d8af9545e23cf',
    event_id: '664bd5d4cd8d8af9545e23d9',
    output_format: 'json',
    template_id: '65c654c08065030c14a3170e'
  }
};

axios.request(options).then(function (response) {
  console.log(response.data);
}).catch(function (error) {
  console.error(error);
});

   