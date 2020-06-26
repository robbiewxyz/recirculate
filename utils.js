Utils = {}

// yes = stream
Utils.yes = Core.source (() => true)
// no = stream
Utils.no = Core.source (() => false)

// pipe (stream) => stream
Utils.pipe = s => Core.source (() => Core.sink (s))
// reduce ((acc, value) => acc) (acc) (stream) => stream
Utils.reduce = i => a => s => Core.source (() => a = i (a, Core.sink (s)))
// map (value => value) (stream) => stream
Utils.map = i => s => Core.source (() => i (Core.sink (s)))
// filter (value => boolean) (stream) => stream
Utils.filter = i => s => Core.source (() => reduce ((a, v) => i (v) ? v : a) (null) (s))
// and (...streams) => stream
Utils.and = (...ss) => Core.source (() => ss.reduce ((a, s) => a && Core.sink (s), true))
// or (...streams) => stream
Utils.or = (...ss) => Core.source (() => ss.reduce ((a, s) => a || Core.sink (s), false))
// comma (...streams) => stream
Utils.comma = (...ss) => Core.source (() => ss.reduce ((a, s) => Core.sink (s), null))

// interval (delay) => stream
Utils.interval = d => Core.source (put => {
	const i = setInterval (put, Core.sink (d))
	return () => clearInterval (i)
})
// raf => stream
Utils.raf = Core.source (put => {
	const r = () => i = (put (), requestAnimationFrame (r))
	let i = requestAnimationFrame (r)
	return () => clearAnimationFrame (i)
})
