const { recirculate, source, sink } = Core
const { comma } = Utils

const mousemove = source (put => (
	window.addEventListener (`mousemove`, put),
	() => window.removeEventListener (`mousemove`, put)
))

const colorPicker = color => comma (
	source (put => (
		document.body.style.backgroundColor = sink (color),
		() => document.body.style.backgroundColor = null
	)),
	source (() => (
		`hsl(${(sink (mousemove)?.pageX || 0) / window.innerWidth * 360},100%,50%)`
	))
)

document.addEventListener (`readystatechange`, ev => (
	document.readyState === `interactive` && recirculate (colorPicker)
))
