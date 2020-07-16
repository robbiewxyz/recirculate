import { Put, Source, recirculate, source, sink } from '../src'

test (`initial put should propagate once`, () => {
	const log: Array<any> = []
	const initial = source (put => { put (`initial`) })
	const logger = source (put => { put (0), log.push (sink (initial)) })
	const dispose = recirculate (() => logger)
	expect (log).toEqual ([ `initial` ])
	dispose ()
})

test (`propagate should recirculate`, () => {
	const log: Array<any> = []
	const dispose = recirculate ((input: Source<number>) => source ((put: Put<number>) => {
		try {
			log.push (sink (input))
			if (sink (input) < 5) put ((sink (input) || 0) + 1)
		} catch (e) {
			put (0)
		}
	}))
	expect (log).toEqual ([ 0, 1, 2, 3, 4, 5 ])
	dispose ()
})

test (`dispose should stop recirculate`, () => {
	const log: Array<any> = []
	const startstop = source (put => {
		log.push (`start`)
		return () => log.push (`stop`)
	})
	const dispose = recirculate (() => startstop)
	dispose ()
	expect (log).toEqual ([ `start`, `stop` ])
})

test (`changing upstreams should dispose`, () => {
	const log: Array<any> = []
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
		let number
		try {
			number = sink (input)
		} catch (e) {
			number = 0
		}
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
	const log: Array<any> = []
	let primaryPut: Put<any> | undefined
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
	primaryPut && primaryPut (`secondary`)
	dispose ()
	expect (log).toEqual ([ `on primary`, `on secondary`, `off primary`, `off secondary` ])
})

test (`downstream substitution should be contigious`, () => {
	const log: Array<any> = []
	const primary = source (put => (log.push (`on primary`), () => log.push (`off primary`)))
	const one = source (() => sink (primary))
	const two = source (() => sink (primary))
	const dispose = recirculate (input => source (put => {
		if (!sink (input)) sink (one), put (true)
		else sink (two)
	}))
	expect (log).toEqual ([ `on primary` ])
	dispose ()
})

test (`nested sources should cache`, () => {
	const log: Array<any> = []
	let _put: Put<any> | undefined
	const primary = source ((put: Put<any>) => (_put = put, undefined))
	const three = source (put => {
		const n = sink (source (() => sink (primary) - (sink (primary) % 3)))
		log.push (`three ${n}`)
	})
	const dispose = recirculate (() => three)
	for (let i = 0; i < 10; i++) _put && _put (i)
	expect (log).toEqual ([ `three 0`, `three 3`, `three 6`, `three 9` ])
	dispose ()
})
