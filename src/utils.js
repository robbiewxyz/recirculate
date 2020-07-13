import { source, sink } from '.'

// expr (track) => value
export const expr = track => sink (source (track))

// yes = source
export const yes = source (() => true)
// no = source
export const no = source (() => false)

// pipe (source) => source
export const pipe = s => source (() => sink (s))
// reduce ((acc, value) => acc) (acc) (source) => source
export const reduce = i => a => s => source (() => a = i (a, sink (s)))
// map (value => value) (source) => source
export const map = i => s => source (() => i (sink (s)))
// filter (value => boolean) (source) => source
export const filter = i => s => source (() => reduce ((a, v) => i (v) ? v : a) (null) (s))
// and (...sources) => source
export const and = (...ss) => source (() => ss.reduce ((a, s) => a && sink (s), true))
// or (...sources) => source
export const or = (...ss) => source (() => ss.reduce ((a, s) => a || sink (s), false))
// comma (...sources) => source
export const comma = (...ss) => source (() => ss.reduce ((a, s) => sink (s), null))
// combine (...sources) => source
export const combine = (...ss) => source (put => ss.forEach (s => sink (source (() => put (sink (s))))))

// interval (delay) => source
export const interval = d => source (put => {
	const i = setInterval (put, sink (d))
	return () => clearInterval (i)
})
// raf => source
export const raf = source (put => {
	const r = () => i = (put (), requestAnimationFrame (r))
	let i = requestAnimationFrame (r)
	return () => clearAnimationFrame (i)
})
