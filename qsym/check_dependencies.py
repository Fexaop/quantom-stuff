#!/usr/bin/env python3
"""
Quick verification script to check all dependencies and show system info
"""

import sys
import platform

print("=" * 70)
print("QUANTUM ML - DEPENDENCY CHECK")
print("=" * 70)

print(f"\nSystem Information:")
print(f"  • Python Version: {sys.version}")
print(f"  • Platform: {platform.platform()}")
print(f"  • Architecture: {platform.machine()}")

print(f"\n{'Package':<20} {'Status':<15} {'Version':<15}")
print("-" * 70)

packages = [
    ('numpy', 'import numpy as np'),
    ('matplotlib', 'import matplotlib.pyplot as plt'),
    ('sklearn', 'from sklearn import datasets'),
    ('seaborn', 'import seaborn as sns'),
    ('pennylane', 'import pennylane as qml'),
]

missing = []
for pkg_name, import_stmt in packages:
    try:
        exec(import_stmt)
        # Get version
        if pkg_name == 'sklearn':
            import sklearn
            version = sklearn.__version__
        elif pkg_name == 'pennylane':
            import pennylane
            version = pennylane.__version__
        elif pkg_name == 'seaborn':
            import seaborn
            version = seaborn.__version__
        elif pkg_name == 'matplotlib':
            import matplotlib
            version = matplotlib.__version__
        else:
            import numpy
            version = numpy.__version__
        print(f"{pkg_name:<20} ✓ Installed{'':<10} {version:<15}")
    except ImportError:
        print(f"{pkg_name:<20} ✗ Missing{'':<12} {'---':<15}")
        missing.append(pkg_name)

print("\n" + "=" * 70)

if missing:
    print(f"\n⚠️  Missing packages: {', '.join(missing)}")
    print(f"\nInstall with:")
    print(f"  pip install {' '.join(missing)}")
else:
    print("\n✓ All dependencies installed!")
    print("\nYou can now run:")
    print("  • python3 quantum_coin_toss.py")
    print("  • python3 quantum_ml_mnist.py")

print("\n" + "=" * 70)
