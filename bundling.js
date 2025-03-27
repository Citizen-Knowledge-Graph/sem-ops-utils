import {
    datasetToTurtle,
    turtleToDataset,
    buildValidator,
    storeFromTurtles,
    extractFirstIndividualUriFromTurtle,
    expandShortenedUri
} from "./src/main.js"

window.SemOpsUtils = {
    datasetToTurtle,
    turtleToDataset,
    buildValidator,
    storeFromTurtles,
    extractFirstIndividualUriFromTurtle,
    expandShortenedUri
}
