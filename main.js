/** @type {HTMLDivElement} */
const list = document.body.querySelector('#main')
/** @type {HTMLDivElement} */
const dropEl = document.body.querySelector('#dropzone')

/** @param {Iterable<number>} a */
function hexify(a) {
    const out = []
    for (let n of a) {
        out.push((n.toString(16).length == 1 ? '0' : '') + n.toString(16))
    }
    return out.join(' ')
}

/** @param {number} a */
function hexify4(a) {
    return (Array(5 - a.toString(16).length).join('0') + a.toString(16))
}


/** @param {Iterable<number>} a */
function binify(a) {
    const out = []
    for (let n of a) {
        out.push(Array(9 - n.toString(2).length).join('0') + n.toString(2))
    }
    return out.join(' ')
}

/** @param {Iterable<number>} a */
function textify(a) {
    const out = []
    for (let n of a) {
        out.push((n > 32 && n < 127 ? String.fromCharCode(n) : '.'))
    }
    return out.join('')
}

/** @param {Iterable<number>} a */
function uintify(a) {
    let out = 0
    let exp = 0;
    for (let n of a) {
        out += n * (1 << (exp * 8))
        exp += 1
    }
    return out
}

/** @param {number} a */
function bitifybyte(a) {
    // return [a >> 7,
    //        (a >> 6) & 1,
    //        (a >> 5) & 1,
    //        (a >> 4) & 1,
    //        (a >> 3) & 1,
    //        (a >> 2) & 1,
    //         a & 1]
    return [a & 1,
        (a >> 1) & 1,
        (a >> 2) & 1,
        (a >> 3) & 1,
        (a >> 4) & 1,
        (a >> 5) & 1,
        (a >> 6) & 1,
        a >> 7
    ]
}

/** @param {Uint8Array} data */
function initialize(data) {
    window.data = data
    window.offset = 0
    window.supported_codepoints = []
}

/**
 * @param {HTMLElement} el
 * @param {boolean} lg
 * @param {string} [id]
 */
function outputSection(el, lg, id) {
    let it = document.createElement('hr')
    it.classList.toggle('huge', lg)
    if (id)
        it.id = id
    el.appendChild(it)
}

/**
 * @param {HTMLElement} el
 * @param {string[]} fmts
 * @param {number} byteAmt
 * @param {string} text
 * @param {string} [_comment]
 */
function outputItem(el, fmts, byteAmt, text, _comment) {
    let li = document.createElement('li'),
        content = document.createElement('span'),
        item = data.slice(0, byteAmt)

    if (data.length < byteAmt) {
        throw new Error(`Unexpected end of data ${offset}, read ${byteAmt} but only ${data.length} left`)
    }

    li.innerHTML = '<code class="offset">' + hexify4(offset) + '</code>'
    content.classList.add('content')
    li.appendChild(content)
    if (fmts.indexOf('hex') >= 0)
        content.innerHTML +=
        '<code><grayed>0x</grayed>' +
        hexify(item) +
        '</code>'
    if (fmts.indexOf('dec') >= 0)
        content.innerHTML +=
        '<code>' +
        uintify(item) +
        '</code>'
    if (fmts.indexOf('bin') >= 0)
        content.innerHTML +=
        '<code><grayed>0b</grayed>' +
        binify(item) +
        '</code>'
    if (fmts.indexOf('direct') >= 0) {
        supported_codepoints.push(String.fromCodePoint(uintify(item)))
        content.innerHTML +=
            '<code class="utf">' +
            String.fromCodePoint(uintify(item)) +
            '</code>'
    }
    li.innerHTML += text
    el.appendChild(li)
    offset += byteAmt
    data = data.subarray(byteAmt)
    return uintify(item)
}

/**
 * @param {HTMLElement} el
 * @param {string} s */
function outputErrorMessage(el, s) {
  const li = document.createElement('li')
  li.classList = 'error'
  li.innerHTML = s
  el.appendChild(li)
  return s
}

/** @param {number} byteAmt */
function readBytes(byteAmt) {
    if (data.length < byteAmt) {
        throw new Error(`Unexpected end of data at ${offset}, read ${byteAmt} but only ${data.length} left`)
    }
    let item = data.subarray(0, byteAmt)
    offset += byteAmt
    data = data.subarray(byteAmt)
    return item
}

/**
 * @param {HTMLElement} el
 * @param {number} size
 * @returns {HashTableEntry[]}
 */
function loadHashTable(el, size) {
    outputSection(el, true, 'hash')
    let data = []
    for (let i = 0; i < size; i++) {
        if (i)
            outputSection(el, false)
        let hash_value =
            outputItem(el, ['hex'], 1, 'Value', 'Hash Value.')
        let offset_table_size =
            outputItem(el, ['hex'], 1, 'Offset-Table-Size', 'Offset Table Size.')
        let offset_table_offset =
            outputItem(el, ['hex', 'dec'], 2, 'Offset-Table-Offset', 'Offset location.')
        data.push({
            'hash': hash_value,
            'size': offset_table_size,
            'offset': offset_table_offset
        })
    }
    return data
}

/**
 * @param {HTMLElement} el
 * @param {HashTableEntry[]} offset_table_info
 * @param {number} codepoint_bytes
 * @param {number} features
 * @returns {OffsetTableEntry[]}
 */
function loadOffsetTables(el, offset_table_info, codepoint_bytes, features) {
    offset_table_info.sort((a, b) => a.offset - b.offset)
    let offset_table_offset = offset
    outputSection(el, true, 'offset')
    let first = true
    let out = []
    for (let i of offset_table_info) {
        if (!first)
            outputSection(el, false)
        else first = false
        el.appendChild(document.createTextNode(JSON.stringify(i)))
        el.appendChild(document.createElement('br'))
        el.appendChild(document.createTextNode(
            '∆=' + (offset - offset_table_offset - i['offset'])))
        // console.log(i)
        while ((offset - offset_table_offset - i['offset']) < 0) {
            outputItem(el, ['hex'], 1, 'Unused!?', 'Discarded while getting to correct offset.')
        }
        for (let j = 0; j < i['size']; j++) {
            let codepoint =
                outputItem(el, ['hex', 'dec', 'direct'], codepoint_bytes, 'Codepoint', 'Unicode char.')
            let charOffset =
                outputItem(el, ['hex'], features & 1 ? 2 : 4, 'Offset', 'Data offset location.')
            out.push({ 'codepoint': codepoint, 'offset': charOffset })
        }
    }
    return out
}

/**
 * @param {HTMLElement} el
 * @param {OffsetTableEntry[]} glyph_table_info
 * @param {number} codepoint_bytes
 * @param {number} [features]
 */
function loadGlyphTable(el, glyph_table_info, codepoint_bytes, features) {
    glyph_table_info.sort((a, b) => a.offset - b.offset)
    console.log(glyph_table_info)
    let glyph_table_offset = offset

    outputSection(el, true, 'glyph')
    let first = true
    for (let i of glyph_table_info) {
        if (!first)
            outputSection(el, false)
        else first = false
        el.appendChild(document.createTextNode(JSON.stringify(i)))
        let code = document.createElement('code')
        code.innerText = String.fromCodePoint(i.codepoint)
        el.appendChild(code)
        console.log(offset, glyph_table_offset, i['offset'])
        if (offset > glyph_table_offset + i['offset']) {
            outputErrorMessage(el, 'Reusing former glyph data, omitting')
            continue
        }
        while ((offset - glyph_table_offset - i['offset']) < 0) {
            outputItem(el, ['hex'], 4, 'Unused!?', 'Discarded while getting to correct offset.')
        }
        let bitmapWidth =
            outputItem(el, ['dec'], 1, 'Bmp-Width')
        let bitmapHeight =
            outputItem(el, ['dec'], 1, 'Bmp-Height')
        let offsetLeft =
            outputItem(el, ['dec'], 1, 'Offset-Left')
        let offsetTop =
            outputItem(el, ['dec'], 1, 'Offset-Top')
        let horizontalAdvance =
            outputItem(el, ['dec'], 1, 'Horiz-Advance')
        // outputItem(el, ['hex'], 3, '')
        if (features & 2) { // use rle4
            outputErrorMessage(el, 'Parsing RLE4-encoded bitmap is not yet supported')
        } else { // actual bitmap
            const bitmapBytes = Math.ceil(bitmapHeight * bitmapWidth / 8 / 4) * 4

            if (bitmapBytes == 0) {
                outputErrorMessage(el, 'Bitmap is empty')
            } else {
                const buffer = Array.from(readBytes(bitmapBytes)).flatMap(bitifybyte)

                const imgData = new Uint8ClampedArray(bitmapHeight * bitmapWidth * 4)
                for (let i = 0; i < bitmapHeight * bitmapWidth; i++) {
                    const data = buffer[i]
                    const color = data ? 220 : 0  // 1 = gainsboro
                    imgData[i * 4    ] = color
                    imgData[i * 4 + 1] = color
                    imgData[i * 4 + 2] = color
                    imgData[i * 4 + 3] = 255
                }

                const scaleFactor = 5
                const canvas = document.createElement('canvas')
                canvas.width = bitmapWidth * scaleFactor
                canvas.height = bitmapHeight * scaleFactor
                const ctx = canvas.getContext('2d')
                ctx.putImageData(new ImageData(imgData, bitmapWidth, bitmapHeight), 0, 0)
                ctx.imageSmoothingEnabled = false
                ctx.drawImage(canvas, 0, 0, bitmapWidth, bitmapHeight, 0, 0, canvas.width, canvas.height)

                const img = document.createElement('img')
                img.classList = 'rendered'
                img.width = canvas.width
                img.height = canvas.height
                img.src = canvas.toDataURL()

                el.appendChild(img)
            }
        }
    }
    console.log(glyph_table_info)
    window.a = glyph_table_info
}

/**
 * @param {ArrayBuffer} f
 * @param {HTMLElement} el
 */
function loadFile(f, el) {
    const initialF = new Uint8Array(f);
    console.log('file len', initialF.length);
    initialize(initialF)

    let version =
        outputItem(el, ['hex'], 1, 'Version', 'Font version.')
    outputItem(el, ['dec'], 1, 'Max-Height', 'Line height.')
    let glyph_amount =
        outputItem(el, ['dec'], 2, 'Glyph-Amt', 'The total amount of glyphs encoded.')
    outputItem(el, ['hex'], 2, 'Wildcard-Codepoint', 'The codepoint to use when a character isn\'t found.')
    let hash_table_size =
        outputItem(el, ['hex'], 1, 'Hash-Table-Size', 'Total size of the hash table.')
    let codepoint_bytes =
        outputItem(el, ['hex'], 1, 'Codepoint-Bytes', 'Size of a codepoint in the offset_table')
    let features = 0 // default u32 offsets in v2/v1
    if (version == 3) {
        outputItem(el, ['hex'], 1, 'Size')
        features =
            outputItem(el, ['bin'], 1, 'Features [0b1 | 0: u32; 1: u16 /// 0b10 | bitmapped; 1: rle4]')
    } else if (version > 3) {
        outputErrorMessage(el, `Unexpected version ${version}; aborting`)
        return
    }
    // if (glyph_amount > 10000) {
    //     outputErrorMessage(el, `Too many glyphs (${glyph_amount}); aborting`)
    //     return
    // }
    let offset_table_info =
        loadHashTable(el, hash_table_size)
    let glyph_table_info =
        loadOffsetTables(el, offset_table_info, codepoint_bytes, features)
    loadGlyphTable(el, glyph_table_info, features)

    let li = document.createElement('li')
    let metrics_info =
        outputSection(el, true, 'chars')
    li.innerHTML = "Chars: " + supported_codepoints
        .sort()
        .map(a => '<code>' + a + '</code>')
        .join(', ')
    el.appendChild(li)

    setTimeout(() => window.scrollTo(0, document.querySelector('#chars').offsetTop - 100), 100)
}

dropEl.addEventListener('dragenter', e => {
    //
})
dropEl.addEventListener('dragover', e => {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
})
dropEl.addEventListener('drop', e => {
    e.stopPropagation()
    e.preventDefault()
    if (e.dataTransfer.files.length == 1) {
        console.log('FILES')
        let reader = new FileReader(),
            name = e.dataTransfer.files[0].name

        list.innerHTML = ''
        reader.readAsArrayBuffer(e.dataTransfer.files[0])
        reader.addEventListener('load', () => {
            const ab = /** @type {ArrayBuffer} */(reader.result)
            // console.log(btoa(Array.from(new Uint8Array(ab)).map(x => String.fromCodePoint(x)).join('')));
            try {
                loadFile(ab, list)
            } catch (/** @type {any} */ err) {
                outputErrorMessage(list, err.message)
                console.error(err)
            }
        })
    }
})

// If you'd like to autoload a font (useful when debugging this tool), the
// below code may be helpful.
//
// let initData = "... put your b64 here ..."
//
// var bin = atob(initData);
// var bytes = new Uint8Array(bin.length);
// for (var i = 0; i < bin.length; i++) {
//     bytes[i] = bin.charCodeAt(i);
// }
//
// loadFile(bytes.buffer, list)
