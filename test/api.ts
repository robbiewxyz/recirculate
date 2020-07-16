import * as recirculate from '../src'
import pkg from '../package.json'

test (`should expose the correct api`, () => {
	expect (
		Object.keys (recirculate).sort ()
	).toEqual ([
		//`Fragment`,
		`Pending`,
		`Source`,
		`and`,
		`combine`,
		`comma`,
		`expr`,
		`filter`,
		//`h`,
		`interval`,
		`isSource`,
		`map`,
		`no`,
		`or`,
		`pipe`,
		`raf`,
		`recirculate`,
		`reduce`,
		//`render`,
		`sink`,
		`source`,
		`yes`,
	])
})

test (`should have no dependencies`, () => {
	expect (pkg.dependencies).toEqual ({})
})
