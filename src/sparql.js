import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite"

export const queryEngine = new QueryEngine()

export async function sparqlConstruct(query, sourceStores, targetStore) {
    const quadStream = await queryEngine.queryQuads(query, { sources: sourceStores })
    let constructedQuads = []
    return new Promise((resolve, reject) => {
        quadStream.on("data", (quad) => {
            if (targetStore) targetStore.addQuad(quad)
            constructedQuads.push(quad)
        })
        quadStream.on("end", () => resolve(constructedQuads))
        quadStream.on("error", (err) => reject(err))
    })
}

export async function sparqlSelect(query, stores) {
    let bindingsStream = await queryEngine.queryBindings(query, { sources: stores })
    let bindings = await bindingsStream.toArray()
    let results = []
    bindings.forEach(binding => {
        const variables = Array.from(binding.keys()).map(({ value }) => value)
        let row = {}
        variables.forEach(variable => {
            row[variable] = binding.get(variable).value
        })
        results.push(row)
    })
    return results
}

export async function sparqlInsertDelete(query, store) {
    await queryEngine.queryVoid(query, { sources: [store] })
}

export async function sparqlAsk(query, stores) {
    return await queryEngine.queryBoolean(query, { sources: stores })
}
