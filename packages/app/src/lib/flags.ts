// Feature flags, read once from the URL.
// ?notes=list (default): the step's notes listed on the left under the title, numbered; hovering one focuses and
//   highlights its line in the code and writes the note at the text.
// ?notes=margin: hand-drawn notes in the margin beside the code instead, each with an arrow to its line.
export type NotesMode = 'margin' | 'list'

const params = new URLSearchParams(location.search)

export const notesMode: NotesMode = params.get('notes') === 'margin' ? 'margin' : 'list'
