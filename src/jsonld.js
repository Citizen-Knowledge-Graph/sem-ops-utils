import { getRdf, parser, prefixes, turtleToDataset } from "./core.js"
import jsonld from "jsonld"

export async function datasetToJsonLdObj(dataset, rootLevelTypes = []) {
    const nquads = await getRdf().io.dataset.toText("application/n-quads", dataset)
    const expanded = await jsonld.fromRDF(nquads, { format: "application/n-quads" })
    if (rootLevelTypes.length === 0) {
        return await jsonld.compact(expanded, prefixes)
    }
    const ROOT_FRAME = {
        "@context": prefixes,
        "@type": rootLevelTypes
    }
    const framed = await jsonld.frame(expanded, ROOT_FRAME)
    return await jsonld.compact(framed, prefixes)
}

export async function turtleToJsonLdObj(turtle) {
    return datasetToJsonLdObj(turtleToDataset(turtle))
}

export async function jsonLdObjToDataset(jsonLdObj) {
    const rdf = getRdf()
    const nquads = await jsonld.toRDF(jsonLdObj, { format: "application/n-quads" })
    return rdf.dataset(parser.parse(nquads))
}

export async function storeToJsonLdObj(store, rootLevelTypes = []) {
    const rdf = getRdf()
    const dataset = rdf.dataset(store.getQuads())
    return await datasetToJsonLdObj(dataset, rootLevelTypes)
}
