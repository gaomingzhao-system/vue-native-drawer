/** Open drawers, the most recently opened last. Only the top one reacts to Escape and Tab. */
const stack: symbol[] = []

export const pushDrawer = (id: symbol): void => {
  removeDrawer(id)
  stack.push(id)
}

export const removeDrawer = (id: symbol): void => {
  const index = stack.indexOf(id)
  if (index !== -1) stack.splice(index, 1)
}

export const isTopDrawer = (id: symbol): boolean => stack.at(-1) === id
