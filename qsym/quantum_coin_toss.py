#!/usr/bin/env python3
"""
Quantum Coin Toss Simulation
Simulates a fair coin toss using quantum mechanics (Hadamard gate superposition)
"""

import numpy as np
import matplotlib.pyplot as plt
from collections import Counter


class QuantumCoinToss:
    """Simple quantum coin toss simulator"""

    def __init__(self, num_tosses=1024):
        """
        Initialize the quantum coin toss simulator

        Args:
            num_tosses: Number of coin tosses to simulate
        """
        self.num_tosses = num_tosses
        self.results = []

    def hadamard_gate(self):
        """
        Apply Hadamard gate to |0> state
        H|0> = 1/sqrt(2) * (|0> + |1>)
        This creates a 50-50 superposition
        """
        h_factor = 1.0 / np.sqrt(2)
        # State amplitudes after Hadamard gate
        amplitude_0 = h_factor  # probability of measuring 0
        amplitude_1 = h_factor  # probability of measuring 1

        return amplitude_0, amplitude_1

    def measure_qubit(self):
        """
        Measure the qubit in superposition
        Returns 0 or 1 based on probability amplitudes
        """
        amplitude_0, amplitude_1 = self.hadamard_gate()

        # Probability = |amplitude|^2
        prob_0 = amplitude_0 ** 2
        prob_1 = amplitude_1 ** 2

        # Randomly choose outcome based on probabilities
        outcome = np.random.choice([0, 1], p=[prob_0, prob_1])
        return outcome

    def toss_coin(self):
        """Simulate coin toss by measuring qubit num_tosses times"""
        self.results = [self.measure_qubit() for _ in range(self.num_tosses)]
        return self.results

    def get_statistics(self):
        """Get statistics from coin tosses"""
        counts = Counter(self.results)
        total = len(self.results)

        heads = counts.get(0, 0)
        tails = counts.get(1, 0)

        return {
            'heads': heads,
            'tails': tails,
            'heads_percentage': (heads / total) * 100,
            'tails_percentage': (tails / total) * 100,
            'total': total
        }

    def plot_results(self, title="Quantum Coin Toss Results"):
        """Visualize the coin toss results"""
        stats = self.get_statistics()

        fig, axes = plt.subplots(1, 2, figsize=(12, 5))

        # Bar chart
        ax1 = axes[0]
        outcomes = ['Heads (0)', 'Tails (1)']
        counts = [stats['heads'], stats['tails']]
        colors = ['#3498db', '#e74c3c']

        bars = ax1.bar(outcomes, counts, color=colors, alpha=0.7, edgecolor='black', linewidth=2)
        ax1.set_ylabel('Count', fontsize=12, fontweight='bold')
        ax1.set_title(f'Coin Toss Counts (n={self.num_tosses})', fontsize=13, fontweight='bold')
        ax1.grid(axis='y', alpha=0.3)

        # Add count labels on bars
        for bar, count in zip(bars, counts):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'{int(count)}',
                    ha='center', va='bottom', fontweight='bold')

        # Pie chart
        ax2 = axes[1]
        percentages = [stats['heads_percentage'], stats['tails_percentage']]
        ax2.pie(percentages, labels=outcomes, autopct='%1.1f%%',
               colors=colors, startangle=90, textprops={'fontsize': 11, 'fontweight': 'bold'})
        ax2.set_title('Distribution', fontsize=13, fontweight='bold')

        plt.suptitle(title, fontsize=14, fontweight='bold', y=1.02)
        plt.tight_layout()

        return fig, axes, stats

    def plot_cumulative(self):
        """Plot cumulative probability over time"""
        cumulative_heads = np.cumsum([1 if x == 0 else 0 for x in self.results])
        cumulative_tails = np.cumsum([1 if x == 1 else 0 for x in self.results])
        tosses = np.arange(1, self.num_tosses + 1)

        prob_heads = cumulative_heads / tosses
        prob_tails = cumulative_tails / tosses

        fig, ax = plt.subplots(figsize=(12, 6))

        ax.plot(tosses, prob_heads, label='Heads (0)', color='#3498db', linewidth=2)
        ax.plot(tosses, prob_tails, label='Tails (1)', color='#e74c3c', linewidth=2)
        ax.axhline(y=0.5, color='#2ecc71', linestyle='--', linewidth=2, label='Expected (0.5)')

        ax.set_xlabel('Number of Tosses', fontsize=12, fontweight='bold')
        ax.set_ylabel('Probability', fontsize=12, fontweight='bold')
        ax.set_title('Convergence to Fair Coin (50% Probability)', fontsize=13, fontweight='bold')
        ax.legend(fontsize=11, loc='best')
        ax.grid(alpha=0.3)
        ax.set_ylim([0, 1])

        plt.tight_layout()
        return fig, ax


def main():
    """Main function to run quantum coin toss simulation"""

    print("=" * 60)
    print("QUANTUM COIN TOSS SIMULATOR")
    print("=" * 60)
    print("\nSimulating quantum coin tosses using Hadamard gate superposition...")
    print("Expected result: ~50% Heads, ~50% Tails (fair coin)\n")

    # Run simulation with different number of tosses
    for num_tosses in [100, 1024, 10000]:
        print(f"\n{'='*60}")
        print(f"Running {num_tosses} tosses...")
        print(f"{'='*60}")

        simulator = QuantumCoinToss(num_tosses=num_tosses)
        simulator.toss_coin()
        stats = simulator.get_statistics()

        print(f"Results:")
        print(f"  Heads (|0>): {stats['heads']} ({stats['heads_percentage']:.1f}%)")
        print(f"  Tails (|1>): {stats['tails']} ({stats['tails_percentage']:.1f}%)")

    # Create visualizations for 1024 tosses
    print(f"\n{'='*60}")
    print("Creating visualizations...")
    print(f"{'='*60}\n")

    simulator = QuantumCoinToss(num_tosses=1024)
    simulator.toss_coin()

    # Plot 1: Bar and Pie charts
    fig1, axes1, stats = simulator.plot_results(
        "Quantum Coin Toss: Hadamard Gate Measurement"
    )
    plt.savefig('/home/gunit/Documents/physics-project/qsym/coin_toss_results.png', dpi=150, bbox_inches='tight')
    print("✓ Saved: coin_toss_results.png")

    # Plot 2: Cumulative convergence
    fig2, ax2 = simulator.plot_cumulative()
    plt.savefig('/home/gunit/Documents/physics-project/qsym/coin_toss_convergence.png', dpi=150, bbox_inches='tight')
    print("✓ Saved: coin_toss_convergence.png")

    plt.show()

    print(f"\n{'='*60}")
    print("Simulation complete!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
