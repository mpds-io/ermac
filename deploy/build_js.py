#!/usr/bin/env python3
"""
Ermac ES-module bundler: builds ermac.min.js from src_js/ without Node.js.

The application is authored as ES modules (native import/export). This script
concatenates them into a single classic script:

  1. vendored vanilla libraries are prepended as-is (they define window globals);
  2. modules are appended in dependency order (topological sort, entry: src_js/app/run.js);
  3. `import ... from ...` statements are stripped (names resolve at script scope);
  4. `export function`/`export const` keep their declarations, `export default <name>` is dropped.

Supported import syntax (single line each):
  import { a, b } from './x.js';
  import name from './x.js';        (default export)
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = os.path.join(ROOT, "src_js", "app", "run.js")
TARGET = os.path.join(ROOT, "ermac.min.js")

# NB order matters, these define window globals used by the app modules
VENDORED = [
    "src_js/third_party/wNumb.js",
    "src_js/third_party/nouislider.js",
    "src_js/third_party/optimade_mpds_nlp.js",
    "src_js/third_party/darkmode.js",
]

IMPORT_RE = re.compile(
    r"""^\s*import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+['"]([^'"]+)['"];\s*$"""
)
EXPORT_DEFAULT_RE = re.compile(r"""^\s*export\s+default\s+([\w$]+)\s*;\s*$""")
EXPORT_DECL_RE = re.compile(
    r"""^\s*export\s+(?=(?:async\s+)?function\b|const\b|let\b|var\b|class\b)"""
)


class Module(object):
    def __init__(self, path):
        self.path = path
        with open(path, "r", encoding="utf-8") as f:
            self.lines = f.read().splitlines()
        self.imports = []  # (default_alias, [named], resolved_path)
        self.default_export = None  # local name of `export default`
        self.exports = set()
        self.emitted = None

        kept = []
        for line in self.lines:
            import_match = IMPORT_RE.match(line)
            if import_match:
                default_alias, named, target = import_match.groups()
                named = [n.strip() for n in (named or "").split(",") if n.strip()]
                self.imports.append((default_alias, named, self.resolve(target)))
                continue

            default_match = EXPORT_DEFAULT_RE.match(line)
            if default_match:
                self.default_export = default_match.group(1)
                continue

            decl_match = EXPORT_DECL_RE.match(line)
            if decl_match:
                self.exports.add(declare_name(line))
                kept.append(EXPORT_DECL_RE.sub("", line, count=1))
                continue

            if re.match(r"^\s*export\s*\{", line):
                raise SyntaxError(
                    "Named export blocks are not supported: %s in %s" % (line, path)
                )

            kept.append(line)
        self.body = "\n".join(kept)

    def resolve(self, target):
        if not target.startswith("."):
            raise ImportError(
                "Only relative imports are supported: %s in %s" % (target, self.path)
            )
        resolved = os.path.normpath(os.path.join(os.path.dirname(self.path), target))
        if not os.path.exists(resolved):
            raise ImportError("Unresolved import: %s in %s" % (target, self.path))
        return resolved


def declare_name(line):
    m = (
        re.match(r"\s*(?:export\s+)?(?:async\s+)?function\s+([\w$]+)", line)
        or re.match(r"\s*(?:export\s+)?(?:const|let|var)\s+([\w$]+)", line)
        or re.match(r"\s*(?:export\s+)?class\s+([\w$]+)", line)
    )
    if not m:
        raise SyntaxError("Cannot determine the exported name: %s" % line)
    return m.group(1)


def bundle():
    modules = {}

    def load(path):
        path = os.path.abspath(path)
        if path not in modules:
            modules[path] = Module(path)
            for default_alias, named, target in modules[path].imports:
                load(target)
        return modules[path]

    entry = load(ENTRY)

    # topological order, DFS post-order, cycle-tolerant
    order = []
    visited = set()

    def visit(path):
        if path in visited:
            return
        visited.add(path)
        for default_alias, named, target in modules[path].imports:
            visit(target)
        order.append(path)

    visit(os.path.abspath(ENTRY))

    # validate the import graph
    for path, module in modules.items():
        for default_alias, named, target in module.imports:
            target_module = modules[target]
            if default_alias:
                if not target_module.default_export:
                    raise ImportError(
                        "%s imports a default export, but %s has none" % (path, target)
                    )
                if default_alias != target_module.default_export:
                    raise ImportError(
                        "Default import %r in %s must be aliased as %r in the bundle"
                        % (default_alias, path, target_module.default_export)
                    )
            for name in named:
                if name not in target_module.exports:
                    raise ImportError(
                        "%s imports %r, but %s does not export it"
                        % (path, name, target)
                    )

    parts = [
        "/* Ermac, the embeddable MPDS GUI: https://github.com/mpds-io/ermac */",
        "/* NB built by deploy/build_js.py, do not edit */",
        '"use strict";',
        "",
    ]

    for vendor in VENDORED:
        vendor_path = os.path.join(ROOT, vendor)
        with open(vendor_path, "r", encoding="utf-8") as f:
            parts.append("/* %s */" % vendor)
            parts.append(f.read())
            parts.append("")

    for path in order:
        module = modules[path]
        parts.append("/* module: %s */" % os.path.relpath(path, ROOT))
        parts.append(module.body)
        parts.append("")

    result = "\n".join(parts) + "\n"
    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(result)

    print(
        "Bundled %d app modules + %d vendored libs -> %s (%d KB)"
        % (
            len(order),
            len(VENDORED),
            os.path.relpath(TARGET, ROOT),
            len(result) // 1024,
        )
    )
    print("Module order:")
    for path in order:
        print("  - %s" % os.path.relpath(path, ROOT))
    print("NB check absence of errors in the output above")


if __name__ == "__main__":
    try:
        bundle()
    except (ImportError, SyntaxError) as e:
        sys.exit("BUILD ERROR: %s" % e)
