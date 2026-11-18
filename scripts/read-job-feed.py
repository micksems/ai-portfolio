"""Convert an employer's public RSS 2.0 job feed to discovery records."""
import json
import sys
import xml.etree.ElementTree as ET


def read_jobs(raw):
    if b'<!DOCTYPE' in raw.upper():
        raise ValueError('Unexpected document type in employer feed')
    root = ET.fromstring(raw)
    channel = root.find('channel')
    if root.tag != 'rss' or channel is None:
        raise ValueError('Expected an RSS channel')
    jobs = []
    for item in channel.findall('item'):
        title = (item.findtext('title') or '').strip()
        link = (item.findtext('link') or '').strip()
        if not title or not link:
            raise ValueError('Employer RSS item needs a title and posting URL')
        jobs.append({'title': title, 'url': link,
                     'description': item.findtext('description') or '',
                     'publishedAt': item.findtext('pubDate') or None})
    return jobs


if __name__ == '__main__':
    try:
        json.dump(read_jobs(sys.stdin.buffer.read()), sys.stdout)
    except (ValueError, ET.ParseError) as error:
        sys.exit(str(error))
