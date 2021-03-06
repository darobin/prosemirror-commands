const {Schema} = require("prosemirror-model")
const {EditorState} = require("prosemirror-state")
const {schema, eq, doc, blockquote, pre, h1, p, li, ol, ul, em, hr} = require("prosemirror-model/test/build")
const ist = require("ist")
const {selFor} = require("prosemirror-state/test/state")

const {joinBackward, joinForward, deleteSelection, deleteCharBefore, deleteWordBefore,
       deleteCharAfter, deleteWordAfter, joinUp, joinDown, lift,
       wrapIn, splitBlock, liftEmptyBlock, createParagraphNear, setBlockType,
       selectParentNode, autoJoin} = require("../dist/commands")

function apply(doc, command, result) {
  let state = EditorState.create({doc, selection: selFor(doc)})
  command(state, action => state = state.applyAction(action))
  ist(state.doc, result || doc, eq)
  if (result && result.tag.a != null) ist(state.selection, selFor(result), eq)
}

describe("joinBackward", () => {
  it("can join paragraphs", () =>
     apply(doc(p("hi"), p("<a>there")), joinBackward, doc(p("hithere"))))

  it("can join out of a nested node", () =>
     apply(doc(p("hi"), blockquote(p("<a>there"))), joinBackward,
           doc(p("hi"), p("there"))))

  it("moves a block into an adjacent wrapper", () =>
     apply(doc(blockquote(p("hi")), p("<a>there")), joinBackward,
           doc(blockquote(p("hi"), p("there")))))

  it("moves a block into an adjacent wrapper from another wrapper", () =>
     apply(doc(blockquote(p("hi")), blockquote(p("<a>there"))), joinBackward,
           doc(blockquote(p("hi"), p("there")))))

  it("joins the wrapper to a subsequent one if applicable", () =>
     apply(doc(blockquote(p("hi")), p("<a>there"), blockquote(p("x"))), joinBackward,
           doc(blockquote(p("hi"), p("there"), p("x")))))

  it("moves a block into a list item", () =>
     apply(doc(ul(li(p("hi"))), p("<a>there")), joinBackward,
           doc(ul(li(p("hi")), li(p("there"))))))

  it("joins lists", () =>
     apply(doc(ul(li(p("hi"))), ul(li(p("<a>there")))), joinBackward,
           doc(ul(li(p("hi")), li(p("there"))))))

  it("joins list items", () =>
     apply(doc(ul(li(p("hi")), li(p("<a>there")))), joinBackward,
           doc(ul(li(p("hi"), p("there"))))))

  it("lifts out of a list at the start", () =>
     apply(doc(ul(li(p("<a>there")))), joinBackward, doc(p("<a>there"))))

  it("joins lists before and after", () =>
     apply(doc(ul(li(p("hi"))), p("<a>there"), ul(li(p("x")))), joinBackward,
           doc(ul(li(p("hi")), li(p("there")), li(p("x"))))))

  it("deletes leaf nodes before", () =>
     apply(doc(hr, p("<a>there")), joinBackward, doc(p("there"))))

  it("deletes before it lifts", () =>
     apply(doc(hr, blockquote(p("<a>there"))), joinBackward, doc(blockquote(p("there")))))

  it("does nothing at start of doc", () =>
     apply(doc(p("<a>foo")), joinBackward, null))
})

describe("deleteSelection", () => {
  it("deletes part of a text node", () =>
     apply(doc(p("f<a>o<b>o")), deleteSelection, doc(p("fo"))))

  it("can delete across blocks", () =>
     apply(doc(p("f<a>oo"), p("ba<b>r")), deleteSelection, doc(p("fr"))))

  it("deletes node selections", () =>
     apply(doc(p("foo"), "<a>", hr), deleteSelection, doc(p("foo"))))

  it("moves selection after deleted node", () =>
     apply(doc(p("a"), "<a>", p("b"), blockquote(p("c"))), deleteSelection,
           doc(p("a"), blockquote(p("<a>c")))))

  it("moves selection before deleted node at end", () =>
     apply(doc(p("a"), "<a>", p("b")), deleteSelection,
           doc(p("a<a>"))))
})

describe("deleteCharBefore", () => {
  it("deletes the character before", () =>
     apply(doc(p("ba<a>r")), deleteCharBefore, doc(p("br"))))

  it("deletes combining characters", () =>
     // The c has two combining characters, which must be deleted along with it
     apply(doc(p("fç̀<a>o")), deleteCharBefore, doc(p("fo"))))

  it("doesn't touch combining characters before the next real char", () =>
     apply(doc(p("çç<a>ç")), deleteCharBefore, doc(p("çç"))))

  it("deletes astral characters as a unit", () =>
     apply(doc(p("😅😆<a>😇😈")), deleteCharBefore, doc(p("😅😇😈"))))
})

describe("deleteWordBefore", () => {
  it("deletes a word including a space after it", () =>
     apply(doc(p("foo bar <a>baz")), deleteWordBefore, doc(p("foo baz"))))

  it("deletes a word directly before the cursor", () =>
     apply(doc(p("foo bar<a> baz")), deleteWordBefore, doc(p("foo  baz"))))

  it("deletes a group of non-word characters", () =>
     apply(doc(p("foo ...<a>baz")), deleteWordBefore, doc(p("foo baz"))))

  it("does nothing at the start of a block", () =>
     apply(doc(p("<a>foo")), deleteWordBefore, null))

  it("deletes a group of space characters", () =>
     apply(doc(p("foo   <a>bar")), deleteWordBefore, doc(p("foobar"))))
})

describe("joinForward", () => {
  it("joins two textblocks", () =>
     apply(doc(p("foo<a>"), p("bar")), joinForward, doc(p("foobar"))))

  it("does nothing at the end of the document", () =>
     apply(doc(p("foo<a>")), joinForward, null))

  it("deletes a leaf node after the current block", () =>
     apply(doc(p("foo<a>"), hr, p("bar")), joinForward, doc(p("foo"), p("bar"))))

  it("pulls the next block into the current list item", () =>
     apply(doc(ul(li(p("a<a>")), li(p("b")))), joinForward,
           doc(ul(li(p("a"), p("b"))))))

  it("joins two blocks inside of a list item", () =>
     apply(doc(ul(li(p("a<a>"), p("b")))), joinForward,
           doc(ul(li(p("ab"))))))

  it("pulls the next block into a blockquote", () =>
     apply(doc(blockquote(p("foo<a>")), p("bar")), joinForward,
           doc(blockquote(p("foo<a>"), p("bar")))))

  it("joins two blockquotes", () =>
     apply(doc(blockquote(p("hi<a>")), blockquote(p("there"))), joinForward,
           doc(blockquote(p("hi"), p("there")))))

  it("pulls the next block outside of a wrapping blockquote", () =>
     apply(doc(p("foo<a>"), blockquote(p("bar"))), joinForward,
           doc(p("foo"), p("bar"))))

  it("joins two lists", () =>
     apply(doc(ul(li(p("hi<a>"))), ul(li(p("there")))), joinForward,
           doc(ul(li(p("hi")), li(p("there"))))))

  it("does nothing in a nested node at the end of the document", () =>
     apply(doc(ul(li(p("there<a>")))), joinForward,
           null))

  it("deletes a leaf node at the end of the document", () =>
     apply(doc(blockquote(p("there<a>")), hr), joinForward,
           doc(blockquote(p("there")))))

  it("selects the block node after when it can't join", () =>
     apply(doc(p("foo<a>"), ul(li(p("bar"), ul(li(p("baz")))))), joinForward,
           doc(p("foo<a>"), "<a>", ul(li(p("bar"), ul(li(p("baz"))))))))
})

describe("deleteCharAfter", () => {
  it("deletes the character after", () =>
     apply(doc(p("b<a>ar")), deleteCharAfter, doc(p("br"))))

  it("deletes combining characters after the next char", () =>
     // The c has two combining characters
     apply(doc(p("f<a>ç̀o")), deleteCharAfter, doc(p("fo"))))

  it("doesn't touch other nearby combining characters", () =>
     apply(doc(p("ç<a>çç")), deleteCharAfter, doc(p("çç"))))

  it("deletes an astral plane character as a unit", () =>
     apply(doc(p("😅😆<a>😇😈")), deleteCharAfter, doc(p("😅😆😈"))))
})

describe("deleteWordAfter", () => {
  it("deletes the word after, including a space", () =>
     apply(doc(p("foo<a> bar baz")), deleteWordAfter, doc(p("foo baz"))))

  it("deletes the word directly after", () =>
     apply(doc(p("foo <a>bar baz")), deleteWordAfter, doc(p("foo  baz"))))

  it("deletes a group of non-word characters", () =>
     apply(doc(p("foo<a>... baz")), deleteWordAfter, doc(p("foo baz"))))

  it("does nothing at the end of a block", () =>
     apply(doc(p("foo<a>")), deleteWordAfter, null))

  it("deletes the rest of a word around the cursor", () =>
     apply(doc(p("fo<a>o")), deleteWordAfter, doc(p("fo"))))

  it("deletes a group of whitespace characters", () =>
     apply(doc(p("foo<a>   bar")), deleteWordAfter, doc(p("foobar"))))
})

describe("joinUp", () => {
  it("joins identical parent blocks", () =>
     apply(doc(blockquote(p("foo")), blockquote(p("<a>bar"))), joinUp,
           doc(blockquote(p("foo"), p("<a>bar")))))

  it("does nothing in the first block", () =>
     apply(doc(blockquote(p("<a>foo")), blockquote(p("bar"))), joinUp, null))

  it("joins lists", () =>
     apply(doc(ul(li(p("foo"))), ul(li(p("<a>bar")))), joinUp,
           doc(ul(li(p("foo")), li(p("bar"))))))

  it("joins list items", () =>
     apply(doc(ul(li(p("foo")), li(p("<a>bar")))), joinUp,
           doc(ul(li(p("foo"), p("bar"))))))

  it("doesn't look at ancestors when a block is selected", () =>
     apply(doc(ul(li(p("foo")), li("<a>", p("bar")))), joinUp, null))

  it("can join selected block nodes", () =>
     apply(doc(ul(li(p("foo")), "<a>", li(p("bar")))), joinUp,
           doc(ul("<a>", li(p("foo"), p("bar"))))))
})

describe("joinDown", () => {
  it("joins parent blocks", () =>
     apply(doc(blockquote(p("foo<a>")), blockquote(p("bar"))), joinDown,
           doc(blockquote(p("foo<a>"), p("bar")))))

  it("doesn't join with the block before", () =>
     apply(doc(blockquote(p("foo")), blockquote(p("<a>bar"))), joinDown, null))

  it("joins lists", () =>
     apply(doc(ul(li(p("foo<a>"))), ul(li(p("bar")))), joinDown,
           doc(ul(li(p("foo")), li(p("bar"))))))

  it("joins list items", () =>
     apply(doc(ul(li(p("<a>foo")), li(p("bar")))), joinDown,
           doc(ul(li(p("foo"), p("bar"))))))

  it("doesn't look at parent nodes of a selected node", () =>
     apply(doc(ul(li("<a>", p("foo")), li(p("bar")))), joinDown, null))

  it("can join selected nodes", () =>
     apply(doc(ul("<a>", li(p("foo")), li(p("bar")))), joinDown,
           doc(ul("<a>", li(p("foo"), p("bar"))))))
})

describe("lift", () => {
  it("lifts out of a parent block", () =>
     apply(doc(blockquote(p("<a>foo"))), lift, doc(p("<a>foo"))))

  it("splits the parent block when necessary", () =>
     apply(doc(blockquote(p("foo"), p("<a>bar"), p("baz"))), lift,
           doc(blockquote(p("foo")), p("bar"), blockquote(p("baz")))))

  it("can lift out of a list", () =>
     apply(doc(ul(li(p("<a>foo")))), lift, doc(p("foo"))))

  it("does nothing for a top-level block", () =>
     apply(doc(p("<a>foo")), lift, null))

  it("lifts out of the innermost parent", () =>
     apply(doc(blockquote(ul(li(p("foo<a>"))))), lift,
           doc(blockquote(p("foo<a>")))))

  it("can lift a node selection", () =>
     apply(doc(blockquote("<a>", ul(li(p("foo"))))), lift,
           doc("<a>", ul(li(p("foo"))))))

  it("lifts out of a nested list", () =>
     apply(doc(ul(li(p("one"), ul(li(p("<a>sub1")), li(p("sub2")))), li(p("two")))), lift,
           doc(ul(li(p("one"), p("<a>sub1"), ul(li(p("sub2")))), li(p("two"))))))
})

describe("wrapIn", () => {
  let wrap = wrapIn(schema.nodes.blockquote)

  it("can wrap a paragraph", () =>
     apply(doc(p("fo<a>o")), wrap, doc(blockquote(p("foo")))))

  it("wraps multiple pragraphs", () =>
     apply(doc(p("fo<a>o"), p("bar"), p("ba<b>z"), p("quux")), wrap,
           doc(blockquote(p("foo"), p("bar"), p("baz")), p("quux"))))

  it("wraps an already wrapped node", () =>
     apply(doc(blockquote(p("fo<a>o"))), wrap,
           doc(blockquote(blockquote(p("foo"))))))

  it("can wrap a node selection", () =>
     apply(doc("<a>", ul(li(p("foo")))), wrap,
           doc(blockquote(ul(li(p("foo")))))))
})

describe("splitBlock", () => {
  it("splits a paragraph at the end", () =>
     apply(doc(p("foo<a>")), splitBlock, doc(p("foo"), p())))

  it("split a pragraph in the middle", () =>
    apply(doc(p("foo<a>bar")), splitBlock, doc(p("foo"), p("bar"))))

  it("splits a paragraph from a heading", () =>
     apply(doc(h1("foo<a>")), splitBlock, doc(h1("foo"), p())))

  it("splits a heading in two when in the middle", () =>
     apply(doc(h1("foo<a>bar")), splitBlock, doc(h1("foo"), h1("bar"))))

  it("deletes selected content", () =>
     apply(doc(p("fo<a>ob<b>ar")), splitBlock, doc(p("fo"), p("ar"))))

  it("splits a parent block when a node is selected", () =>
     apply(doc(ol(li(p("a")), "<a>", li(p("b")), li(p("c")))), splitBlock,
           doc(ol(li(p("a"))), ol(li(p("b")), li(p("c"))))))

  it("doesn't split the parent block when at the start", () =>
     apply(doc(ol("<a>", li(p("a")), li(p("b")), li(p("c")))), splitBlock, null))

  it("splits off a normal paragraph when splitting at the start of a textblock", () =>
     apply(doc(h1("<a>foo")), splitBlock, doc(p(), h1("foo"))))

  const hSchema = new Schema({
    nodes: schema.nodeSpec.update("heading", {
      type: schema.nodes.heading.constructor,
      content: "inline<_>*"
    }).update("doc", {
      type: schema.nodes.doc.constructor,
      content: "heading block*"
    })
  })
  function hDoc(a) {
    const hDoc = hSchema.node("doc", null, [
      hSchema.node("heading", {level: 1}, hSchema.text("foobar"))
    ])
    hDoc.tag = {a}
    return hDoc
  }

  it("splits a paragraph from a heading when a double heading isn't allowed", () =>
     apply(hDoc(4), splitBlock,
           hSchema.node("doc", null, [
             hSchema.node("heading", {level: 1}, hSchema.text("foo")),
             hSchema.node("paragraph", null, hSchema.text("bar"))
           ])))

  it("won't try to reset the type of an empty leftover when the schema forbids it", () =>
     apply(hDoc(1), splitBlock,
           hSchema.node("doc", null, [
             hSchema.node("heading", {level: 1}),
             hSchema.node("paragraph", null, hSchema.text("foobar"))
           ])))
})

describe("liftEmptyBlock", () => {
  it("splits the parent block when there are sibling before", () =>
     apply(doc(blockquote(p("foo"), p("<a>"), p("bar"))), liftEmptyBlock,
           doc(blockquote(p("foo")), blockquote(p(), p("bar")))))

  it("lifts the last child out of its parent", () =>
     apply(doc(blockquote(p("foo"), p("<a>"))), liftEmptyBlock,
           doc(blockquote(p("foo")), p())))

  it("lifts an only child", () =>
     apply(doc(blockquote(p("foo")), blockquote(p("<a>"))), liftEmptyBlock,
           doc(blockquote(p("foo")), p("<a>"))))

  it("does not violate schema constraints", () =>
     apply(doc(ul(li(p("<a>foo"), blockquote(p("bar"))))), liftEmptyBlock, null))

  it("lifts out of a list", () =>
     apply(doc(ul(li(p("hi")), li(p("<a>")))), liftEmptyBlock,
           doc(ul(li(p("hi"))), p())))
})

describe("createParagraphNear", () => {
  it("creates a paragraph before a selected node at the start of the doc", () =>
     apply(doc("<a>", hr), createParagraphNear, doc(p(), hr)))

  it("creates a paragraph after selected nodes not at the start of the doc", () =>
     apply(doc(p(), "<a>", hr), createParagraphNear, doc(p(), hr, p())))
})

describe("setBlockType", () => {
  let setHeading = setBlockType(schema.nodes.heading, {level: 1})
  let setPara = setBlockType(schema.nodes.paragraph)
  let setCode = setBlockType(schema.nodes.code_block)

  it("can change the type of a paragraph", () =>
     apply(doc(p("fo<a>o")), setHeading, doc(h1("foo"))))

  it("can change the type of a code block", () =>
     apply(doc(pre("fo<a>o")), setHeading, doc(h1("foo"))))

  it("can make a heading into a paragraph", () =>
     apply(doc(h1("fo<a>o")), setPara, doc(p("foo"))))

  it("preserves marks", () =>
     apply(doc(h1("fo<a>o", em("bar"))), setPara, doc(p("foo", em("bar")))))

  it("acts on node selections", () =>
     apply(doc("<a>", h1("foo")), setPara, doc(p("foo"))))

  it("can make a block a code block", () =>
     apply(doc(h1("fo<a>o")), setCode, doc(pre("foo"))))

  it("clears marks when necessary", () =>
     apply(doc(p("fo<a>o", em("bar"))), setCode, doc(pre("foobar"))))
})

describe("selectParentNode", () => {
  it("selects the whole textblock", () =>
     apply(doc(ul(li(p("foo"), p("b<a>ar")), li(p("baz")))), selectParentNode,
           doc(ul(li(p("foo"), "<a>", p("bar")), li(p("baz"))))))

  it("goes one level up when on a block", () =>
     apply(doc(ul(li(p("foo"), "<a>", p("bar")), li(p("baz")))), selectParentNode,
           doc(ul("<a>", li(p("foo"), p("bar")), li(p("baz"))))))

  it("goes further up", () =>
     apply(doc(ul("<a>", li(p("foo"), p("bar")), li(p("baz")))), selectParentNode,
           doc("<a>", ul(li(p("foo"), p("bar")), li(p("baz"))))))

  it("stops at the top level", () =>
     apply(doc("<a>", ul(li(p("foo"), p("bar")), li(p("baz")))), selectParentNode,
           doc("<a>", ul(li(p("foo"), p("bar")), li(p("baz"))))))
})

describe("autoJoin", () => {
  it("joins lists when deleting a paragraph between them", () =>
     apply(doc(ul(li(p("a"))), "<a>", p("b"), ul(li(p("c")))),
           autoJoin(deleteSelection, ["bullet_list"]),
           doc(ul(li(p("a")), li(p("c"))))))

  it("doesn't join lists when deleting an item inside of them", () =>
     apply(doc(ul(li(p("a")), "<a>", li(p("b"))), ul(li(p("c")))),
           autoJoin(deleteSelection, ["bullet_list"]),
           doc(ul(li(p("a"))), ul(li(p("c"))))))

  it("joins lists when wrapping a paragraph after them in a list", () =>
     apply(doc(ul(li(p("a"))), p("b<a>")),
           autoJoin(wrapIn(schema.nodes.bullet_list), ["bullet_list"]),
           doc(ul(li(p("a")), li(p("b"))))))

  it("joins lists when wrapping a paragraph between them in a list", () =>
     apply(doc(ul(li(p("a"))), p("b<a>"), ul(li(p("c")))),
           autoJoin(wrapIn(schema.nodes.bullet_list), ["bullet_list"]),
           doc(ul(li(p("a")), li(p("b")), li(p("c"))))))

  it("joins lists when lifting a list between them", () =>
     apply(doc(ul(li(p("a"))), blockquote("<a>", ul(li(p("b")))), ul(li(p("c")))),
           autoJoin(lift, ["bullet_list"]),
           doc(ul(li(p("a")), li(p("b")), li(p("c"))))))
})
