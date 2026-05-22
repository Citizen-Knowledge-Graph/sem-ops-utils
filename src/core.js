import formatsPretty from "@rdfjs/formats/pretty.js"
import { isomorphic } from "rdf-isomorphic"
import { Parser, Store, Writer } from "n3"
import rdf from "rdf-ext"

rdf.formats.import(formatsPretty)
export const parser = new Parser({ factory: rdf })

export const a = rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")

export function getRdf() {
    return rdf
}

export function getWriter(prefixes) {
    return new Writer({ prefixes: prefixes })
}

// use rdf.namespace instead to be able to use ns.rdfs.label etc. TODO
export const prefixes = {
    ff: "https://foerderfunke.org/default#",
    sh: "http://www.w3.org/ns/shacl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    shn: "https://schemas.link/shacl-next#",
    schema: "http://schema.org/",
    barcamp: "https://foerderfunke.org/lod-barcamp-bielefeld#"
}

const prefixesArr = Object.entries(prefixes).map(
    ([prefix, iri]) => [prefix, rdf.namedNode(iri)]
)

export async function datasetToTurtle(dataset, additionalPrefixes = {}) {
    if (Object.keys(additionalPrefixes).length > 0) {
        const additionalPrefixesArr = Object.entries(additionalPrefixes).map(
            ([prefix, iri]) => [prefix, rdf.namedNode(iri)]
        )
        prefixesArr.push(...additionalPrefixesArr)
    }
    return await rdf.io.dataset.toText("text/turtle", dataset, { prefixes: prefixesArr })
}

export async function datasetToTurtleWriter(dataset, additionalPrefixes = {}, format = "text/turtle") {
    const mergedPrefixes = {...prefixes, ...additionalPrefixes}
    // another format would be application/n-triples
    const writer = new Writer({ prefixes: mergedPrefixes, format} )
    writer.addQuads([...dataset])
    return await new Promise((resolve, reject) => {
        writer.end((err, result) => {
            if (err) reject(err)
            else resolve(result)
        })
    })
}

export function turtleToDataset(turtle) {
    return rdf.dataset(parser.parse(turtle))
}

export function newStore() {
    return new Store({ factory: rdf })
}

export function storeFromDataset(dataset) {
    const store = newStore()
    for (let quad of dataset) store.addQuad(quad)
    return store
}

export function datasetFromStore(store) {
    return rdf.dataset(store.getQuads())
}

export function addTurtleToStore(store, turtle) {
    store.addQuads(parser.parse(turtle))
}

export function storeFromTurtles(turtleStrings) {
    const store = new Store({ factory: rdf })
    for (let str of turtleStrings) store.addQuads(parser.parse(str))
    return store
}

export function datasetFromTurtles(turtleStrings) {
    const dataset = rdf.dataset()
    for (let str of turtleStrings) {
        const quads = parser.parse(str)
        dataset.addAll(quads)
    }
    return dataset
}

export async function storeToTurtle(store, additionalPrefixes = {}) {
    const dataset = rdf.dataset(store.getQuads())
    return await datasetToTurtle(dataset, additionalPrefixes)
}

export function addStoreToStore(source, target) {
    target.addQuads(source.getQuads())
}

// URI schemes that parseObject promotes to NamedNode - strings like "key:value" stay literals by default
export const URI_SCHEMES = new Set([
    "http", "https",
    "urn", "tag", "did",
    "mailto", "tel", "geo",
    "file", "ftp", "sftp",
    "ws", "wss",
    "info", "data",
])

export function parseObject(obj) {
    if (obj?.termType === "NamedNode" || obj?.termType === "Literal" || obj?.termType === "BlankNode") return obj
    const xsd = suffix => rdf.namedNode(prefixes.xsd + suffix)
    if (typeof obj === "boolean") return rdf.literal(obj.toString(), xsd("boolean"))
    obj = obj.toString().trim()
    if (obj.toLowerCase() === "true") return rdf.literal("true", xsd("boolean"))
    if (obj.toLowerCase() === "false") return rdf.literal("false", xsd("boolean"))
    let expanded = expand(obj)
    // promote to NamedNode only if the part before the first ":" is a recognized URI scheme
    const colon = expanded.indexOf(":")
    if (colon > 0 && URI_SCHEMES.has(expanded.slice(0, colon).toLowerCase())) {
        return rdf.namedNode(expanded)
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) return rdf.literal(obj, xsd("dateTime"))
    if (/^\d{4}-\d{2}-\d{2}/.test(obj)) return rdf.literal(obj.substring(0, 10), xsd("date"))
    let num = Number(obj)
    if (!isNaN(num)) {
        if (Number.isInteger(num)) {
            return rdf.literal(String(parseInt(obj)), xsd("integer"))
        } else {
            return rdf.literal(String(num), xsd("decimal"))
        }
    }
    return rdf.literal(obj)
}

export function addTriple(store, sub, pred, obj) {
    store.addQuad(rdf.namedNode(sub), rdf.namedNode(pred), parseObject(obj))
}

export function isomorphicTurtles(turtle1, turtle2) {
    return isomorphic(turtleToDataset(turtle1), turtleToDataset(turtle2))
}

export function extractFirstIndividualUriFromTurtle(turtle, classUri) {
    const regex = new RegExp(`(.*?)\\s+a\\s+${classUri}`)
    const match = turtle.match(regex)
    if (match) return expand(match[1].trim())
    console.error(`Could not extract individual URI of class ${classUri} from turtle string via regex`)
    return ""
}

export function expand(shortenedUri) {
    for (let prefix of Object.keys(prefixes)) {
        if (shortenedUri.startsWith(prefix + ":")) {
            return prefixes[prefix] + shortenedUri.slice(prefix.length + 1)
        }
    }
    return shortenedUri
}

export function nnExpand(shortenedUri) {
    return rdf.namedNode(expand(shortenedUri))
}

export function shrink(fullUri) {
    for (let [ prefix, uri ] of Object.entries(prefixes)) {
        if (fullUri.startsWith(uri)) {
            return prefix + ":" + fullUri.slice(uri.length)
        }
    }
    return fullUri
}

export function quadToTriple(quad) {
    return { s: quad.subject.value, p: quad.predicate.value, o: quad.object.value }
}

export function formatTimestamp(timestamp, compact = false) {
    const pad = (n, i = 2) => n.toString().padStart(i, "0")
    if(compact) return `${pad(timestamp.getFullYear())}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}${pad(timestamp.getMilliseconds(), 3)}`
    return `${timestamp.getFullYear()}-${pad(timestamp.getMonth() + 1)}-${pad(timestamp.getDate())}_${pad(timestamp.getHours())}-${pad(timestamp.getMinutes())}-${pad(timestamp.getSeconds())}-${pad(timestamp.getMilliseconds(), 3)}`
}

export function formatTimestampAsLiteral(timestamp) {
    return rdf.literal(timestamp.toISOString(), rdf.namedNode("http://www.w3.org/2001/XMLSchema#dateTime"))
}
