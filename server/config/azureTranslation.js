import createTranslationClient from '@azure-rest/ai-translation-text';
import { AzureKeyCredential } from '@azure/core-auth';

const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
const azureKey = process.env.AZURE_TRANSLATOR_KEY;
const region = process.env.AZURE_TRANSLATOR_REGION;

const translationClient = createTranslationClient(endpoint, new AzureKeyCredential(azureKey));

export const translateText = async (text, from, to) => {
    try {
        const response = await translationClient.path('/translate').post({
            body: [{ text }],
            queryParameters: {
                'api-version': '3.0',
                to: [to],
                from: from
            },
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': azureKey,
                'Ocp-Apim-Subscription-Region': region
            }
        });

        if (response.status === '200') {
            const translatedText = response.body[0].translations[0].text;
            return translatedText;
        } else {
            throw new Error(`Translation failed with status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
};