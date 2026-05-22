# sem-ops-utils
A collection of utility functions and libraries for semantic operations

```shell
# after bumping the version
npm publish
```

## Usage

```shell
npm install --save @foerderfunke/sem-ops-utils
```

```js
import { datasetToTurtle } from "@foerderfunke/sem-ops-utils"
```

Submodule entry points are also available so consumers only pull in the dependencies they actually need:

```js
import { addTriple, newStore } from "@foerderfunke/sem-ops-utils/core"     // n3 + rdf-ext only
import { sparqlSelect } from "@foerderfunke/sem-ops-utils/sparql"           // adds Comunica
import { buildValidator } from "@foerderfunke/sem-ops-utils/shacl"          // adds shacl-engine
import { datasetToJsonLdObj } from "@foerderfunke/sem-ops-utils/jsonld"     // adds jsonld
```
