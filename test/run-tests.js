const Chalk = require("chalk")
const Fs = require("fs-extra")
const Glob = require("glob")
const Path = require("path")
const R = require("ramda")
const Util = require("util")
const { spawn } = require("cross-spawn")



const jsonSamples = R.concat([
    `
{
    "account": {
        "id": 1, 
        "user" : {
            "name": "abc",
            "alias": "def",
            "address": {
                "num": 1, 
                "street": "abc", 
                "postcode": 5024
            },
            "import": null,
            "of": true,
            "if": "then",
            "null": false,
            "cards": [],
            "floaty": 1.23,
            "inty": 1.0000000000000001,
            "_isActive": true
        }, 
        "prefs": [
            1, 
            [[[2, 3, 4]]], 
            5,
            "a", 
            {"colors": [
                    "red", 
                    {"h": 100, "s": 100, "l": 100}, 
                    [{"r": {"a": 255}   , "g": 255, "b": 255}]
                ]
            }
        ]
    }
}
`
    , `
false
`
    , `
123
`
    , `
"str"
`
    , `
null
`
    , `
[]
`
    , `
{}
`
    , `
[{"red": 255, "green": 255, "blue": 255}, {"red": 0, "green": 0, "blue": 0}]
`
    , `
[1, [2, [3]]]
`
    , `
[1, [2], 3, ["4"], null]    
`
    , `
{"first": null, "second": [1, 2, "null", 4]}
`
    , `
{"first": [1, [2], 3, ["4"], []]}
`
    , `
{"widget": {
    "debug": "on",
    "window": {
        "title": "Sample Konfabulator Widget",
        "name": "main_window",
        "width": 500,
        "height": 500
    },
    "image": { 
        "src": "Images/Sun.png",
        "name": "sun1",
        "hOffset": 250,
        "vOffset": 250,
        "alignment": "center"
    },
    "text": {
        "data": "Click Here",
        "size": 36,
        "style": "bold",
        "name": "text1",
        "hOffset": 250,
        "vOffset": 100,
        "alignment": "center",
        "onMouseUp": "sun1.opacity = (sun1.opacity / 100) * 90;"
    }
}}    
`
    , `
{
	"items":
		{
			"item":
				[
					{
						"id": "0001",
						"type": "donut",
						"name": "Cake",
						"ppu": 0.55,
						"batters":
							{
								"batter":
									[
										{ "id": "1001", "type": "Regular" },
										{ "id": "1002", "type": "Chocolate" },
										{ "id": "1003", "type": "Blueberry" },
										{ "id": "1004", "type": "Devil's Food" }
									]
							},
						"topping":
							[
								{ "id": "5001", "type": "None" },
								{ "id": "5002", "type": "Glazed" },
								{ "id": "5005", "type": "Sugar" },
								{ "id": "5007", "type": "Powdered Sugar" },
								{ "id": "5006", "type": "Chocolate with Sprinkles" },
								{ "id": "5003", "type": "Chocolate" },
								{ "id": "5004", "type": "Maple" },
								{ "id": "5001", "type": "None" },
								{ "id": "5002", "type": "Glazed" },
								{ "id": "5005", "type": "Sugar" },
								{ "id": "5007", "type": "Powdered Sugar" },
								{ "id": "5006", "type": "Chocolate with Sprinkles" },
								{ "id": "5003", "type": "Chocolate" },
								{ "id": "5004", "type": "Maple" },
								{ "id": "5001", "type": "None" },
								{ "id": "5002", "type": "Glazed" },
								{ "id": "5005", "type": "Sugar" },
								{ "id": "5007", "type": "Powdered Sugar" },
								{ "id": "5006", "type": "Chocolate with Sprinkles" },
								{ "id": "5003", "type": "Chocolate" },
								{ "id": "5004", "type": "Maple" }
							]
					}
				]
		}
}
`
    , `
{ 
    "1": "a", 
    "2": "b",
    "3": "c",
    "4": "d",
    "5": "e",
    "6": "f",
    "7": "g",
    "8": "h",
    "9": "i", 
    "10": "j",
    "11": "k",
    "12": "l",
    "13": "m",
    "14": "n",
    "15": "o",
    "16": "p",
    "17": "q"
}
`
    , `
{"_": 1, "__": 2, "😀": "2", "😀face": false, "@field": null}
`
], R.map((fileName) => Fs.readFileSync(fileName).toString(), Glob.sync("json-samples/*.json")))

const paramSets = R.pipe(
    R.xprod(["noun", "verb"]),
    R.xprod(["none", "all"]),
    R.map(R.flatten)
)(["plain", "pipeline", "applicative"])

console.log({ paramSets })

const compileElm = (sourceFileNames, outputName) => {
    const args = ["make", sourceFileNames, "--optimize", "--output", `generated-js/${outputName}.js`]

    console.log(`  $ elm ${R.flatten(args).join(" ")}`)

    const res = spawn.sync("elm", R.flatten(args), { stdio: 'inherit' })
    if (res.status == 1) {  // This indicates a compiler error
        throw new Error("")
    }
    else if (!R.isNil(res.error) && res.error.errno == "ENOENT") {
        throw new Error(`Couldn't find the Elm executable (${res.error.path})`)
    }
    else
        ; // Compiled successfully
}


compileElm("src/CommandLine.elm", "cli")

const Generator = require("./generated-js/cli").Elm

const generator = Generator.CommandLine.init()


const convert = () => {
    return new Promise((resolve, reject) => {
        let results = []
        // Get data from the worker
        generator.ports.output.subscribe((data) => {
            results.push(data)
            if (R.length(results) == R.length(jsonSamples) * R.length(paramSets))
                resolve(results)
            else
                ; // Keep waiting for more data to fall out of the port
        })

        // Send data to the worker
        R.addIndex(R.forEach)((json, i) => {
            R.forEach((paramSet) => {
                generator.ports.input.send({ id: `${i}`, json, exposingSpec: paramSet[0], namingStyle: paramSet[1], decoderStyle: paramSet[2] })
            }, paramSets)
        }, jsonSamples)
    })
}

const writeTest = (elm) => {
    const test = `
port module Test${elm.id}_${elm.exposingSpec}_${elm.namingStyle}_${elm.decoderStyle} exposing (main)

${elm.output.imports.join("\n")}

import Platform exposing (Program)

-- JSON SAMPLE:
-- ${elm.json.split("\n").join("\n--")}


port output${elm.id}_${elm.exposingSpec}_${elm.namingStyle}_${elm.decoderStyle} : String -> Cmd msg


type alias Flags = String


${elm.output.types.join("\n\n\n")}


${elm.output.decoders.join("\n\n\n")}


${elm.output.encoders.join("\n\n\n")}


init : Flags -> ( (), Cmd msg )
init json =
    ( (), output${elm.id}_${elm.exposingSpec}_${elm.namingStyle}_${elm.decoderStyle} <| trip json )


main : Program Flags () msg
main =
    Platform.worker
        { init = init
        , update = \\msg model -> ( model, Cmd.none )
        , subscriptions = \\_ -> Sub.none
        }


trip : String -> String 
trip json =
    case Json.Decode.decodeString ${elm.namingStyle == "noun" ? "sampleDecoder" : "decodeSample"} json of 
        Err err -> 
            Json.Decode.errorToString err 

        Ok value -> 
            Json.Encode.encode 4 <| ${elm.namingStyle == "noun" ? "encoded" : "encode"}Sample value     
    `

    Fs.writeFileSync(Path.join(__dirname, "generated", `Test${elm.id}-${elm.exposingSpec}-${elm.namingStyle}-${elm.decoderStyle}.elm`), test)
}



convert()
    .then((results) => {
        console.log("Writing Elm test files...")
        return R.forEach(writeTest, results)
    })
    .then((results) => {
        console.log("Compiling Elm test files...")

        try {
            compileElm(Glob.sync("generated/*.elm"), "tests")
        }
        catch (err) {
            console.log(err)
            console.log(
                R.pipe(
                    R.addIndex(R.map)((r, i) => !R.isEmpty(r.error) ? `Test${i}: ${r.error}` : null),
                    R.reject(R.isNil)
                )(results)
            )
            process.exit(1)
        }


        const TestElm = require("./generated-js/tests.js").Elm

        R.addIndex(R.map)((jsonSample, i) => {
            R.forEach((paramSet) => {
                const testName = `Test${i}-${paramSet[0]}-${paramSet[1]}-${paramSet[2]}`
                TestElm[R.replace(/-/g, "_", testName)].init({ flags: jsonSample })
                    .ports[`output${i}_${paramSet[0]}_${paramSet[1]}_${paramSet[2]}`]
                    .subscribe((result) => {
                        if (R.equals(JSON.parse(jsonSample), JSON.parse(result))) {
                            console.log(Chalk.green(`✅ ${testName}`))
                        }
                        else {
                            console.log(Chalk.red(`❌ ${testName}`))
                            console.log("Expected: \n\n" + Chalk.green(jsonSample))
                            console.log("\n\nActual: \n\n" + Chalk.red(result))
                        }
                    })
            }, paramSets)
        }, jsonSamples)

    })
    .catch((err) => console.log(err))

