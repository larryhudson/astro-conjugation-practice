import cheerio from 'cheerio';
import { persons } from './constants';

export function getRandomArrItem(arr: any[]) {
    const randomIndex = Math.floor(Math.random() * arr.length)
    return arr[randomIndex]
}

export async function getCorrectConjugation({ verb, person, conjugation }) {
    // look up in wordreference site
    // TODO: cache the response. use a library for this? eleventy cache?
    const wordReferenceUrl = new URL(`https://www.wordreference.com/conj/FrVerbs.aspx`)
    wordReferenceUrl.searchParams.set('v', verb);

    const wordReferenceResponse = await fetch(wordReferenceUrl);

    if (!wordReferenceResponse.ok) {
        throw new Error('Failed to fetch word reference')
    }

    const wordReferenceHtml = await wordReferenceResponse.text();

    const $ = cheerio.load(wordReferenceHtml);

    const table = conjugation.getTableFromHtml($);

    const personIndex = persons.findIndex(p => p.name === person);
    console.log({ personIndex });

    const correctConjugation = table.find('tr').eq(personIndex + 1).find('td').last().text();

    return correctConjugation;

}

export async function generateSentence({ verb, person, conjugation }) {

    const correctConjugation = await getCorrectConjugation({ verb, person, conjugation });

    console.log({ verb, person, conjugation })
    console.log({ correctConjugation })

    const llmPrompt = `Voici un verbe français :
<verbe>${verb}</verbe>

Voici la personne grammaticale :  
<personne>${person}</personne>

Voici le type de conjugaison :
<conjugaison>${conjugation.name}</conjugaison>

Voici la conjugaison correcte du verbe pour cette personne et ce type de conjugaison :
<conjugue>${correctConjugation}</conjugue>

Veuillez utiliser la conjugaison correcte dans une phrase française simple. La phrase doit démontrer clairement l'utilisation correcte de la conjugaison donnée. 

Écrivez uniquement la phrase, en remplaçant la conjugaison du verbe par [CONJUGAISON]. Ne remplacez pas le pronom personnel.
`

    const llmResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                { role: "system", content: llmPrompt }
            ]
        })
    })

    if (!llmResponse.ok) {
        throw new Error('Failed to fetch LLM response')
    }

    const llmJson = await llmResponse.json();

    const sentence = llmJson.choices[0].message.content;

    return sentence;
}
