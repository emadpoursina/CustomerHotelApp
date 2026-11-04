"""Stdlib JSON Schema walker for the subset used by specs/002-hotel-demo-app/contracts/dashboard.schema.json.

Supports: type, const, enum, required, properties, additionalProperties (false), items,
minItems, maxItems, minimum, maximum, pattern, $ref ("#/$defs/<name>"). Raises ValueError on the first violation.
"""
import json
import os
import re

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'specs', '002-hotel-demo-app', 'contracts', 'dashboard.schema.json')


def load_schema(path=SCHEMA_PATH):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def _types_ok(value, types):
    for t in types:
        if t == 'object' and isinstance(value, dict):
            return True
        if t == 'array' and isinstance(value, list):
            return True
        if t == 'string' and isinstance(value, str):
            return True
        if t == 'integer' and isinstance(value, int) and not isinstance(value, bool):
            return True
        if t == 'number' and isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
        if t == 'null' and value is None:
            return True
        if t == 'boolean' and isinstance(value, bool):
            return True
    return False


def walk(value, schema, root, path='$'):
    if '$ref' in schema:
        name = schema['$ref'].split('/')[-1]
        return walk(value, root['$defs'][name], root, path)
    if 'const' in schema and value != schema['const']:
        raise ValueError('%s: expected const %r' % (path, schema['const']))
    if 'enum' in schema and value not in schema['enum']:
        raise ValueError('%s: value not in enum' % path)
    if 'type' in schema:
        types = schema['type'] if isinstance(schema['type'], list) else [schema['type']]
        if not _types_ok(value, types):
            raise ValueError('%s: wrong type' % path)
    if value is None:
        return
    if isinstance(value, str) and 'pattern' in schema and not re.search(schema['pattern'], value):
        raise ValueError('%s: pattern mismatch' % path)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 'minimum' in schema and value < schema['minimum']:
            raise ValueError('%s: below minimum' % path)
        if 'maximum' in schema and value > schema['maximum']:
            raise ValueError('%s: above maximum' % path)
    if isinstance(value, dict):
        props = schema.get('properties', {})
        for key in schema.get('required', []):
            if key not in value:
                raise ValueError('%s: missing %s' % (path, key))
        if schema.get('additionalProperties') is False:
            extra = set(value) - set(props)
            if extra:
                raise ValueError('%s: unexpected key %s' % (path, sorted(extra)[0]))
        for key, sub in props.items():
            if key in value:
                walk(value[key], sub, root, path + '.' + key)
    if isinstance(value, list):
        if 'minItems' in schema and len(value) < schema['minItems']:
            raise ValueError('%s: too few items' % path)
        if 'maxItems' in schema and len(value) > schema['maxItems']:
            raise ValueError('%s: too many items' % path)
        if 'items' in schema:
            for i, item in enumerate(value):
                walk(item, schema['items'], root, '%s[%d]' % (path, i))


def validate(value, schema=None):
    schema = schema or load_schema()
    walk(value, schema, schema)
