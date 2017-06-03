import yaml

with open('links.yaml', 'r') as f:
    links = yaml.load(f)['links']
    for name, link in links.items():
        print("<a href='%s'>%s <span style='opacity: 0.6'>[%s]</span></a>" % (link['url'], link['name'], link['type']['name']))
