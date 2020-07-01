import * as recirculate from '../src'
import pkg from '../package.json'

test (`should expose the correct api`, () => {
	expect (
		Object.keys (recirculate).sort ()
	).toEqual ([
		`and`,
		`comma`,
		`filter`,
		`interval`,
		`map`,
		`no`,
		`or`,
		`pipe`,
		`raf`,
		`recirculate`,
		`reduce`,
		`sink`,
		`source`,
		`yes`,
	])
})

test (`should have no dependencies`, () => {
	expect (pkg.dependencies).toEqual ({})
})
