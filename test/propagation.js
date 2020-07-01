import { recirculate, source, sink } from '../src'

test (`initial put should propagate once`, () => {
	const log = []
	const initial = source (put => put (`initial`))
	const logger = source (put => log.push (sink (initial)))
	const dispose = recirculate (() => logger)
	expect (log).toEqual ([ `initial` ])
	dispose ()
})

test (`propagate should recirculate`, () => {
	const log = []
	const dispose = recirculate (input => source (put => {
		log.push (sink (input))
		if (sink (input) < 5) put ((sink (input) || 0) + 1)
	}))
	expect (log).toEqual ([ null, 1, 2, 3, 4, 5 ])
	dispose ()
})

test (`dispose should stop recirculate`, () => {
	const log = []
	const startstop = source (put => {
		log.push (`start`)
		return () => log.push (`stop`)
	})
	const dispose = recirculate (() => startstop)
	dispose ()
	expect (log).toEqual ([ `start`, `stop` ])
})

test (`changing upstreams should dispose`, () => {
	const log = []
	const zero = source (put => {
		put (1)
		log.push (`on zero`)
		return () => log.push (`off zero`)
	})
	const one = source (put => {
		put (2)
		log.push (`on one`)
		return () => log.push (`off one`)
	})
	const two = source (put => {
		put (3)
		log.push (`on two`)
		return () => log.push (`off two`)
	})
	const dispose = recirculate (input => source (() => {
		const number = sink (input) || 0
		switch (number) {
			case 0: return sink (zero)
			case 1: return sink (one)
			case 2: return sink (two)
			case 3: return 3
		}
	}))
	expect (log).toEqual ([ `on zero`, `on one`, `on two`, `off zero`, `off one`, `off two` ])
	dispose ()
})

test (`async changes should propagate and dispose`, () => {
	const log = []
	let primaryPut
	const primary = source (put => {
		put (`primary`)
		primaryPut = put
		log.push (`on primary`)
		return () => log.push (`off primary`)
	})
	const secondary = source (put => {
		put (`secondary`)
		log.push (`on secondary`)
		return () => log.push (`off secondary`)
	})
	const dispose = recirculate (input => source (() => {
		switch (sink (input)) {
			case `secondary`: return sink (secondary)
			default: return sink (primary)
		}
	}))
	primaryPut (`secondary`)
	dispose ()
	expect (log).toEqual ([ `on primary`, `on secondary`, `off primary`, `off secondary` ])
})
