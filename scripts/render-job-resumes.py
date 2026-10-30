"""Render reviewed text on Misha's pinned master. No research or invented bullets.

Input: {master:{local_path,sha256}, fonts:{regular,bold}, jobs:[
 {key,company,position,changes:{baseline:text},projectLabels:{baseline:label},output}]}.
Fonts must be genuine Times New Roman. Fonts may be initialized from a previously
saved PDF with the 'fonts SOURCE_PDF OUTPUT_DIRECTORY' subcommand.
"""
import hashlib
import json
import re
import sys
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_master(path):
    import fitz
    with fitz.open(path) as doc:
        if len(doc) != 1 or tuple(doc[0].rect) != (0, 0, 612, 792):
            raise ValueError('Approved master layout changed; review the layout adapter before discovery')
        baselines = {int(s['origin'][1]) for b in doc[0].get_text('dict')['blocks']
                     for line in b.get('lines', []) for s in line['spans']}
        required = {81, 94, 107, 342, 355, 368, 410, 423, 436, 478, 491, 504, 546, 559, 572, 614, 627, 640, 681, 694, 707}
        if not required.issubset(baselines) or len(doc[0].get_links()) != 3 or doc[0].get_text().count('•') != 23:
            raise ValueError('Approved master structure changed; review the layout adapter before discovery')


def checked_fonts(paths):
    import fitz
    from fontTools.ttLib import TTFont
    result = {}
    for kind in ('regular', 'bold'):
        path = Path(paths[kind])
        name = TTFont(path)['name'].getDebugName(6)
        if not re.fullmatch(r'TimesNewRoman(?:PS)?(?:MT|-?Bold(?:MT)?)?', name or ''):
            raise ValueError('Genuine Times New Roman required: ' + str(path))
        if ('Bold' in name) != (kind == 'bold'):
            raise ValueError('Font weight mismatch: ' + kind)
        result[kind] = (fitz.Font(fontfile=str(path)), name)
    return result


def initialize_fonts(source, directory):
    import fitz
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    found = {}
    with fitz.open(source) as doc:
        for page in doc:
            for font in page.get_fonts(full=True):
                name, extension, _, data = doc.extract_font(font[0])
                if 'TimesNewRoman' not in name or extension != 'ttf' or not data:
                    continue
                kind = 'bold' if 'Bold' in name else 'regular'
                path = directory / (kind + '.ttf')
                path.write_bytes(data)
                found[kind] = str(path.resolve())
    checked_fonts(found)
    print(json.dumps(found))


def render(config):
    import fitz
    master = config['master']
    masterpath = Path(master['local_path'])
    if sha(masterpath) != master['sha256']:
        raise ValueError('Master differs from pinned bytes')
    check_master(masterpath)
    fontpaths = config['fonts']
    fonts = checked_fonts(fontpaths)
    with fitz.open(masterpath) as doc:
        if len(doc) != 1:
            raise ValueError('Approved master must be one page')
        spans = sorted([s for b in doc[0].get_text('dict')['blocks']
                        for line in b.get('lines', []) for s in line['spans']],
                       key=lambda s: (s['origin'][1], s['origin'][0]))
        original_bullets = doc[0].get_text().count('•')
    experience = {342, 355, 368, 410, 423, 436, 478, 491, 504, 546, 559, 572, 614, 627, 640}
    editable = experience | {81, 94, 107, 681, 694, 707}
    reports = []
    for job in config['jobs']:
        changes = {int(y): text for y, text in job['changes'].items()}
        labels = {int(y): text for y, text in job['projectLabels'].items()}
        if not set(changes).issubset(editable) or set(labels) != {681, 694, 707}:
            raise ValueError('Unexpected master layout edit')
        if any(not isinstance(t, str) or not t.strip() or '\n' in t for t in changes.values()):
            raise ValueError('Use reviewed single-line replacements')
        doc = fitz.open(masterpath)
        pg = doc[0]
        links = pg.get_links()
        for span in spans:
            pg.add_redact_annot(fitz.Rect(span['bbox']), fill=False)
        pg.apply_redactions(images=0, graphics=0)
        for kind, path in fontpaths.items():
            pg.insert_font(fontname='tnr' + kind, fontfile=path)
        used = {'regular': set(), 'bold': set()}
        for span in spans:
            x, y = span['origin']
            baseline = int(y)
            bold = 'Bold' in span['font']
            kind = 'bold' if bold else 'regular'
            font = fonts[kind][0]
            text = span['text']
            if baseline in labels:
                label = labels[baseline]
                x = 36 if bold else 36 + fonts['bold'][0].text_length(label, fontsize=span['size'])
                if bold:
                    text = label
            if baseline in changes and not bold and (baseline not in experience or x == 53):
                text = ('• ' if baseline in experience else '') + changes[baseline]
            if any(not font.has_glyph(ord(c)) for c in text):
                raise ValueError('Font lacks a required character; use a complete approved font source')
            width = font.text_length(text, fontsize=span['size'])
            if baseline == 28:
                x = (612 - width) / 2
            elif x > 480 and baseline != 205:
                x = span['bbox'][2] - width
            if x + width > 576.5:
                raise ValueError(f"Text overflow for {job['key']} at baseline {baseline}")
            color = span['color']
            rgb = (((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255)
            pg.insert_text((x, y), text, fontname='tnr' + kind, fontsize=span['size'], color=rgb)
            used[kind].update(text)
        for font in pg.get_fonts(full=True):
            if font[4] not in ('tnrregular', 'tnrbold'):
                continue
            kind = font[4][3:]
            unicode_xref = int(re.search(r'/ToUnicode (\d+) 0 R', doc.xref_object(font[0])).group(1))
            mappings = [f'<{fonts[kind][0].has_glyph(ord(c)):04X}> <{ord(c):04X}>' for c in sorted(used[kind])]
            cmap = ('/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n'
                    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n'
                    '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n'
                    '<0000> <FFFF>\nendcodespacerange\n' + str(len(mappings)) + ' beginbfchar\n' +
                    '\n'.join(mappings) + '\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend')
            doc.update_stream(unicode_xref, cmap.encode())
        for link in pg.get_links():
            pg.delete_link(link)
        for link in links:
            pg.insert_link({k: v for k, v in link.items() if k not in ('xref', 'id')})
        pg.clean_contents(sanitize=True)
        resource_fonts = {f[4]: f[0] for f in pg.get_fonts(full=True)}
        for xref in pg.get_contents():
            content = doc.xref_stream(xref).replace(b'/F2+0 ', b'/tnrbold ').replace(b'/F3+0 ', b'/tnrregular ')
            doc.update_stream(xref, content)
        doc.xref_set_key(pg.xref, 'Resources',
                         f'<< /Font << /tnrregular {resource_fonts["tnrregular"]} 0 R /tnrbold {resource_fonts["tnrbold"]} 0 R >> >>')
        for kind in ('regular', 'bold'):
            doc.xref_set_key(resource_fonts['tnr' + kind], 'BaseFont', '/' + fonts[kind][1])
        doc.set_metadata(dict(doc.metadata, title='Misha Semenov - ' + job['company'] + ' - ' + job['position'], author='Misha Semenov'))
        output = Path(job['output'])
        output.parent.mkdir(parents=True, exist_ok=True)
        doc.save(output, garbage=4, deflate=True)
        doc.close()
        with fitz.open(output) as final:
            page = final[0]
            text = page.get_text()
            if len(final) != 1 or text.count('•') != original_bullets:
                raise ValueError('Master structure changed')
            if [l.get('uri') for l in page.get_links()] != [l.get('uri') for l in links]:
                raise ValueError('Contact links changed')
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if span['bbox'][0] < 35.5 or span['bbox'][2] > 577 or span['bbox'][3] > 760:
                            raise ValueError('Text exceeds master bounds')
            for font in page.get_fonts(full=True):
                if not re.match(r'(?:[A-Z]{6}\+)?TimesNewRoman', font[3]) or not final.extract_font(font[0])[3]:
                    raise ValueError('Non-Times or unembedded PDF font')
            image = str(output.with_suffix('.png'))
            textpath = str(output.with_suffix('.txt'))
            page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6)).save(image)
            Path(textpath).write_text(text)
            reports.append(dict(key=job['key'], localPath=str(output.resolve()), sha256=sha(output),
                                text=text, previewPath=image, textPath=textpath,
                                masterLayoutPreserved=True, contactLinksVerified=True,
                                pages=1, bullets=original_bullets, font='Times New Roman'))
    return reports


if __name__ == '__main__':
    try:
        if sys.argv[1] == 'fonts':
            initialize_fonts(sys.argv[2], sys.argv[3])
        elif sys.argv[1] == 'check-fonts':
            checked_fonts(json.loads(Path(sys.argv[2]).read_text()))
            print('Fonts verified')
        elif sys.argv[1] == 'check-master':
            check_master(sys.argv[2])
            print('Master layout verified')
        else:
            path = Path(sys.argv[1])
            reports = render(json.loads(path.read_text()))
            Path(sys.argv[2]).write_text(json.dumps(reports, indent=2))
            print(json.dumps([dict(key=r['key'], path=r['localPath'], sha256=r['sha256']) for r in reports]))
    except (ValueError, KeyError, OSError, IndexError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
