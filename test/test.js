import { describe, it } from "mocha"
import { deepStrictEqual } from "node:assert"
import { parseObject } from "../src/main.js"
import rdf from "rdf-ext"

const xsd = suffix => rdf.namedNode("http://www.w3.org/2001/XMLSchema#" + suffix)

describe("all tests", function () {
    it("test parseObject()", function () {
        const nn  = rdf.namedNode("https://example.org/foo")
        const lit = rdf.literal("foo")
        deepStrictEqual(parseObject(nn), nn)
        deepStrictEqual(parseObject(lit), lit)
        deepStrictEqual(parseObject(nn), nn)
        deepStrictEqual(parseObject(true),  rdf.literal("true",  xsd("boolean")))
        deepStrictEqual(parseObject(false), rdf.literal("false", xsd("boolean")))
        deepStrictEqual(parseObject("true"),  rdf.literal("true",  xsd("boolean")))
        deepStrictEqual(parseObject("false"), rdf.literal("false", xsd("boolean")))
        deepStrictEqual(parseObject("False"), rdf.literal("false", xsd("boolean")))
        deepStrictEqual(parseObject("ff:Test"), rdf.namedNode("https://foerderfunke.org/default#" + "Test"))
        deepStrictEqual(parseObject("https://example.org/dev"), rdf.namedNode("https://example.org/dev"))
        deepStrictEqual(parseObject("2025-07-27T14:30:00"), rdf.literal("2025-07-27T14:30:00", xsd("dateTime")))
        deepStrictEqual(parseObject("2025-07-27"), rdf.literal("2025-07-27", xsd("date")))
        deepStrictEqual(parseObject("7"), rdf.literal("7", xsd("integer")))
        deepStrictEqual(parseObject("-5"), rdf.literal("-5", xsd("integer")))
        deepStrictEqual(parseObject("3.14"), rdf.literal("3.14", xsd("decimal")))
        deepStrictEqual(parseObject(" hello "), rdf.literal("hello"))
    })
})
