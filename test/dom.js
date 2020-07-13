import { recirculate, source, sink, h, render, hydrate } from '../src'

test (`jsdom should work`, () => {
 	const div = document.createElement (`div`)
 	div.textContent += `Hello world!`
 	expect (div.outerHTML).toBe (`<div>Hello world!</div>`)
})

test (`basic dom should render`, () => {
	const container = document.createElement (`div`)
	const dom = render (h (`div`, { foo: `bar` }, `Hello world!`), container)
	recirculate (() => dom)
	expect (container.outerHTML).toBe (`<div><div foo="bar">Hello world!</div></div>`)
})
