const fetch = require('node-fetch');

/**
 * Convert plain text to Markdown using Groq API.
 * @param {string} text - The plain text to convert.
 * @returns {Promise<string>} - The Markdown result.
 */
async function convertTextToMarkdown(text) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY environment variable not set');
    const prompt = `convert the text into clean markdown following markdown best practices for llm:\n- start Headings with #\n- proper spacing for readability\nOutput only the content.\n\n${text}`;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [{ role: 'user', content: prompt }]
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

module.exports = {
    convertTextToMarkdown
};
