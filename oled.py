import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

TARGET_SIZE = 10 
img_path = input("Enter image path: ")

img = Image.open(img_path).convert("RGB")
original_img = np.array(img) 
img_height, img_width = original_img.shape[:2]

print(f"Image loaded: {img_width}x{img_height} pixels")

grid_x = 0
grid_y = 0
grid_size = TARGET_SIZE

def get_grid_samples(full_img, grid_x, grid_y, grid_size):
    h, w = full_img.shape[:2]
    grid_x = max(0, min(grid_x, w - grid_size))
    grid_y = max(0, min(grid_y, h - grid_size))

    sampled = full_img[grid_y:grid_y+grid_size, grid_x:grid_x+grid_size]
    return sampled, grid_x, grid_y

pixels, grid_x, grid_y = get_grid_samples(original_img, grid_x, grid_y, grid_size)

def create_qubit_circuit(r, g, b):
    qc = QuantumCircuit(3)
    r_angle = (r / 255) * np.pi
    g_angle = (g / 255) * np.pi
    b_angle = (b / 255) * np.pi

    qc.ry(r_angle, 0)
    qc.ry(g_angle, 1)
    qc.ry(b_angle, 2)

    return qc

def get_statevector(qc):
    return Statevector.from_instruction(qc)

def rgb_to_binary(r, g, b):
    return f"|{int(r>127)}{int(g>127)}{int(b>127)}⟩"

print(f"\nSimulating {TARGET_SIZE}x{TARGET_SIZE} quantum pixel grid (initial position)...")

matrix_states = []
matrix_binary = []

for y in range(TARGET_SIZE):
    row_states = []
    row_binary = []
    for x in range(TARGET_SIZE):
        r, g, b = pixels[y, x]
        qc = create_qubit_circuit(r, g, b)
        sv = get_statevector(qc)
        binary = rgb_to_binary(r, g, b)

        row_states.append(sv)
        row_binary.append(binary)
    matrix_states.append(row_states)
    matrix_binary.append(row_binary)

matrix_states = np.array(matrix_states)
matrix_binary = np.array(matrix_binary)

class PixelInteractor:
    def __init__(self, full_img, pixel_samples, matrix_states, matrix_binary, target_size, start_x, start_y):
        self.full_img = full_img  
        self.pixel_samples = pixel_samples  
        self.matrix_states = matrix_states
        self.matrix_binary = matrix_binary
        self.target_size = target_size
        self.grid_x = start_x
        self.grid_y = start_y
        self.selected_pixel = (0, 0)
        self.zoom = 1.0
        self.dragging = False
        self.drag_start = None
        self.u = np.linspace(0, 2*np.pi, 20)
        self.v = np.linspace(0, np.pi, 20)
        self.sx = np.outer(np.cos(self.u), np.sin(self.v))
        self.sy = np.outer(np.sin(self.u), np.sin(self.v))
        self.sz = np.outer(np.ones(len(self.u)), np.cos(self.v))

        plt.style.use('default')
        self.fig = plt.figure(figsize=(28, 16), facecolor='#000000')
        self.fig.patch.set_facecolor('#000000')
        plt.rcParams['toolbar'] = 'none'
        
        gs = self.fig.add_gridspec(2, 9, width_ratios=[2.5, 0.1, 1.2, 0.65, 0.65, 0.65, 0.65, 0.3, 0.3],
                                       height_ratios=[1.1, 1], hspace=0.2, wspace=0.25)
        ax_full = self.fig.add_subplot(gs[:, 0])
        self.im_display = ax_full.imshow(full_img, interpolation='bilinear')
        ax_full.set_title("FULL IMAGE (Drag grid / Double-click to reposition)", fontsize=12,
                         fontweight='bold', color='#00d4ff', pad=10)
        ax_full.set_facecolor('#000000')
        self.ax_full = ax_full
        self.grid_rect = Rectangle((self.grid_x - 0.5, self.grid_y - 0.5), target_size, target_size,
                                   fill=False, edgecolor='#00ff00', linewidth=2.5, linestyle='--')
        ax_full.add_patch(self.grid_rect)
        ax_magnifier = self.fig.add_subplot(gs[:, 2])
        ax_magnifier.set_facecolor('#000000')
        ax_magnifier.set_title("PIXEL GRID (Click to select)", fontsize=12, color='#ffff00', pad=8)
        self.ax_magnifier = ax_magnifier
        self.magnifier_image = None
        self.magnifier_grid_cells = []

        ax_info = self.fig.add_subplot(gs[0, 3:5])
        ax_info.axis('off')
        ax_info.set_facecolor('#000000')
        self.info_text = ax_info.text(0.02, 0.98, "", fontsize=7.8, verticalalignment='top',
                                     family='monospace', transform=ax_info.transAxes,
                                     color='#00ff99', bbox=dict(boxstyle='round,pad=0.8',
                                     facecolor='#0a0a15', edgecolor='#00ff99', linewidth=1.2, alpha=0.95))

        ax_formula = self.fig.add_subplot(gs[0, 5:])
        ax_formula.axis('off')
        ax_formula.set_facecolor('#000000')
        self.formula_text = ax_formula.text(0.02, 0.98, "", fontsize=6, verticalalignment='top',
                                           family='monospace', transform=ax_formula.transAxes,
                                           color='#ffff99', bbox=dict(boxstyle='round,pad=0.6',
                                           facecolor='#1a1a00', edgecolor='#ffff99', linewidth=0.8, alpha=0.9))

        self.bloch_axes = []
        self.bloch_surfaces = []
        colors = ['#ff5555', '#55ff55', '#5555ff']
        labels = ['RED', 'GREEN', 'BLUE']

        for i in range(3):
            ax = self.fig.add_subplot(gs[1, 3+i], projection='3d')
            ax.set_facecolor('#000000')
            ax.set_title(labels[i], fontsize=10, fontweight='bold', color=colors[i], pad=3)
            ax.set_xlabel('X', fontsize=6, color='#666')
            ax.set_ylabel('Y', fontsize=6, color='#666')
            ax.set_zlabel('Z', fontsize=6, color='#666')
            ax.tick_params(colors='#444', labelsize=4)
            ax.grid(False)
            for pane in [ax.xaxis.pane, ax.yaxis.pane, ax.zaxis.pane]:
                pane.fill = False
                pane.set_edgecolor('#222')

            surf = ax.plot_surface(self.sx, self.sy, self.sz, alpha=0.06, color=colors[i])
            self.bloch_surfaces.append((ax, colors[i], surf))
            self.bloch_axes.append((ax, colors[i]))

        self.fig.canvas.mpl_connect('button_press_event', self.on_click)
        self.fig.canvas.mpl_connect('button_release_event', self.on_release)
        self.fig.canvas.mpl_connect('motion_notify_event', self.on_motion)
        self.fig.canvas.mpl_connect('scroll_event', self.on_scroll)
        self.update_display(0, 0)

    def on_click(self, event):
        if event.inaxes == self.ax_magnifier:
            if event.xdata is not None and event.ydata is not None:
                x = int(np.clip(event.xdata, 0, self.target_size - 0.5))
                y = int(np.clip(event.ydata, 0, self.target_size - 0.5))
                self.update_display(x, y)
            return

        if event.inaxes == self.ax_full:
            if event.dblclick:
                if event.xdata is not None and event.ydata is not None:
                    self.grid_x = max(0, min(int(event.xdata) - self.target_size // 2,
                                            self.full_img.shape[1] - self.target_size))
                    self.grid_y = max(0, min(int(event.ydata) - self.target_size // 2,
                                            self.full_img.shape[0] - self.target_size))
                    self.resample_grid()
                    self.update_display(0, 0)
            else:
                if event.xdata is not None and event.ydata is not None:
                    self.dragging = True
                    self.drag_start = (int(event.xdata), int(event.ydata))
            return

    def on_release(self, event):
        self.dragging = False

    def on_motion(self, event):
        if self.dragging and event.xdata is not None and event.ydata is not None:
            dx = int(event.xdata) - self.drag_start[0]
            dy = int(event.ydata) - self.drag_start[1]

            new_x = max(0, min(self.grid_x + dx, self.full_img.shape[1] - self.target_size))
            new_y = max(0, min(self.grid_y + dy, self.full_img.shape[0] - self.target_size))

            if new_x != self.grid_x or new_y != self.grid_y:
                self.grid_x = new_x
                self.grid_y = new_y
                self.drag_start = (int(event.xdata), int(event.ydata))
                self.resample_grid()
                self.update_display(0, 0)

    def on_scroll(self, event):
        if event.inaxes == self.ax_magnifier:
            if event.button == 'up':
                self.zoom = min(self.zoom * 1.3, 5.0)
            elif event.button == 'down':
                self.zoom = max(self.zoom / 1.3, 1.0)
            self.update_magnifier()

    def resample_grid(self):
        self.pixel_samples = self.full_img[self.grid_y:self.grid_y+self.target_size,
                                          self.grid_x:self.grid_x+self.target_size]

        matrix_states = []
        matrix_binary = []

        for y in range(self.target_size):
            row_states = []
            row_binary = []
            for x in range(self.target_size):
                r, g, b = self.pixel_samples[y, x]
                qc = create_qubit_circuit(r, g, b)
                sv = get_statevector(qc)
                binary = rgb_to_binary(r, g, b)
                row_states.append(sv)
                row_binary.append(binary)
            matrix_states.append(row_states)
            matrix_binary.append(row_binary)

        self.matrix_states = np.array(matrix_states)
        self.matrix_binary = np.array(matrix_binary)

    def update_magnifier(self):
        self.ax_magnifier.clear()
        self.ax_magnifier.imshow(self.pixel_samples, interpolation='nearest')

        for i in range(self.target_size + 1):
            self.ax_magnifier.axhline(i - 0.5, color='#00ff00', linewidth=0.8, alpha=0.4)
            self.ax_magnifier.axvline(i - 0.5, color='#00ff00', linewidth=0.8, alpha=0.4)

        x, y = self.selected_pixel
        rect = Rectangle((x - 0.5, y - 0.5), 1, 1, fill=False, edgecolor='#ffff00',
                         linewidth=2.5, linestyle='-')
        self.ax_magnifier.add_patch(rect)

        self.ax_magnifier.set_xticks(range(self.target_size))
        self.ax_magnifier.set_yticks(range(self.target_size))
        self.ax_magnifier.set_xticklabels([str(i) for i in range(self.target_size)], fontsize=6, color='#666')
        self.ax_magnifier.set_yticklabels([str(i) for i in range(self.target_size)], fontsize=6, color='#666')
        self.ax_magnifier.set_title("PIXEL GRID (Click to select)", fontsize=12, color='#ffff00', pad=8)

        self.fig.canvas.draw_idle()

    def get_all_probabilities(self, statevector):
        sv_data = np.asarray(statevector.data, dtype=complex)
        probs = np.abs(sv_data) ** 2
        return probs

    def get_dominant_state(self, statevector):
        sv_data = np.asarray(statevector.data, dtype=complex)
        max_idx = np.argmax(np.abs(sv_data) ** 2)
        return format(max_idx, '03b'), np.abs(sv_data[max_idx]) ** 2

    def ry_matrix(self, theta):
        c = np.cos(theta/2)
        s = np.sin(theta/2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def apply_ry_qubit(self, rgb_val):
        intensity = rgb_val / 255.0
        theta = intensity * np.pi

        matrix = self.ry_matrix(theta)
        psi_0 = np.array([1, 0], dtype=complex)
        result = matrix @ psi_0

        return intensity, theta, matrix, result

    def format_formulas(self, r, g, b):
        r_int, r_theta, r_mat, r_state = self.apply_ry_qubit(r)
        g_int, g_theta, g_mat, g_state = self.apply_ry_qubit(g)
        b_int, b_theta, b_mat, b_state = self.apply_ry_qubit(b)

        text = ""
        text += "RED QUBIT (Q0):\n"
        text += f"  RGB value: {r}\n"
        text += f"  Intensity: I = {r}/255 = {r_int:.4f}\n"
        text += f"  Angle: θ = I × π = {r_theta:.4f} rad ({r_theta/np.pi:.3f}π)\n"
        text += f"  Ry(θ) = [[{r_mat[0,0].real:.3f}, {r_mat[0,1].real:.3f}],\n"
        text += f"            [{r_mat[1,0].real:.3f}, {r_mat[1,1].real:.3f}]]\n"
        text += f"  |ψ_R⟩ = Ry({r_theta/np.pi:.3f}π)|0⟩ = [{r_state[0].real:.4f}, {r_state[1].real:.4f}]\n\n"

        text += "GREEN QUBIT (Q1):\n"
        text += f"  RGB value: {g}\n"
        text += f"  Intensity: I = {g}/255 = {g_int:.4f}\n"
        text += f"  Angle: θ = I × π = {g_theta:.4f} rad ({g_theta/np.pi:.3f}π)\n"
        text += f"  Ry(θ) = [[{g_mat[0,0].real:.3f}, {g_mat[0,1].real:.3f}],\n"
        text += f"            [{g_mat[1,0].real:.3f}, {g_mat[1,1].real:.3f}]]\n"
        text += f"  |ψ_G⟩ = Ry({g_theta/np.pi:.3f}π)|0⟩ = [{g_state[0].real:.4f}, {g_state[1].real:.4f}]\n\n"

        text += "BLUE QUBIT (Q2):\n"
        text += f"  RGB value: {b}\n"
        text += f"  Intensity: I = {b}/255 = {b_int:.4f}\n"
        text += f"  Angle: θ = I × π = {b_theta:.4f} rad ({b_theta/np.pi:.3f}π)\n"
        text += f"  Ry(θ) = [[{b_mat[0,0].real:.3f}, {b_mat[0,1].real:.3f}],\n"
        text += f"            [{b_mat[1,0].real:.3f}, {b_mat[1,1].real:.3f}]]\n"
        text += f"  |ψ_B⟩ = Ry({b_theta/np.pi:.3f}π)|0⟩ = [{b_state[0].real:.4f}, {b_state[1].real:.4f}]\n\n"

        text += "FINAL STATE:\n"
        text += f"|ψ⟩ = |ψ_R⟩ ⊗ |ψ_G⟩ ⊗ |ψ_B⟩\n"
        text += f"(Tensor product of 3 qubits)"

        return text

    def update_display(self, x, y):
        self.grid_rect.set_xy((self.grid_x - 0.5, self.grid_y - 0.5))

        r, g, b = self.pixel_samples[y, x]
        statevector = self.matrix_states[y, x]
        binary_state = self.matrix_binary[y, x]

        self.selected_pixel = (x, y)

        r_norm = r / 255.0
        g_norm = g / 255.0
        b_norm = b / 255.0

        dominant, dominant_prob = self.get_dominant_state(statevector)
        probs = self.get_all_probabilities(statevector)

        info = f"Pixel: ({self.grid_x + x}, {self.grid_y + y})\n"
        info += f"(Grid: {x}, {y})\n"
        info += f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        info += f"RGB: ({r:3d}, {g:3d}, {b:3d})\n"
        info += f"Norm: [{r_norm:.3f}, {g_norm:.3f}, {b_norm:.3f}]\n\n"

        info += f"State: {binary_state}\n"
        info += f"Dominant: |{dominant}⟩ ({dominant_prob:.1%})\n\n"

        info += f"Angles (Ry):\n"
        info += f"θR = {r_norm:.3f}π  ({r_norm*180:.1f}°)\n"
        info += f"θG = {g_norm:.3f}π  ({g_norm*180:.1f}°)\n"
        info += f"θB = {b_norm:.3f}π  ({b_norm*180:.1f}°)\n\n"

        info += f"Probabilities:\n"
        for i in range(8):
            state_bin = format(i, '03b')
            prob = probs[i]
            bar_len = int(prob * 25)
            empty_len = 25 - bar_len
            bar = '█' * bar_len + '░' * empty_len
            info += f"|{state_bin}⟩ {prob*100:5.1f}% │{bar}│\n"

        info += f"\nDrag the green box to\nreposition the 10x10 grid"

        self.info_text.set_text(info)

        formula_display = self.format_formulas(r, g, b)
        self.formula_text.set_text(formula_display)

        rgb_values = [r, g, b]
        for idx, (ax, color) in enumerate(self.bloch_axes):
            while len(ax.collections) > 1:
                ax.collections[1].remove()
            while len(ax.lines) > 3:  
                ax.lines[-1].remove()

            rgb_val = rgb_values[idx]
            angle = (rgb_val / 255) * np.pi

            ax.set_title(f"Q{idx}: θ={angle/np.pi:.3f}π", fontsize=10,
                        fontweight='bold', color=color, pad=3)

            bloch_x = np.sin(angle)
            bloch_y = 0
            bloch_z = np.cos(angle)

            # Draw axes
            ax.plot([-1.3, 1.3], [0, 0], [0, 0], color='#333333', linewidth=0.6, alpha=0.3)
            ax.plot([0, 0], [-1.3, 1.3], [0, 0], color='#333333', linewidth=0.6, alpha=0.3)
            ax.plot([0, 0], [0, 0], [-1.3, 1.3], color='#333333', linewidth=0.6, alpha=0.3)

            # Draw vector (quiver)
            ax.quiver(0, 0, 0, bloch_x, bloch_y, bloch_z, color=color,
                     arrow_length_ratio=0.12, linewidth=2.5)
            # Draw endpoint
            ax.scatter([bloch_x], [bloch_y], [bloch_z], color=color, s=180, marker='o',
                      edgecolor='#ffff00', linewidth=1.5, zorder=15)

        self.update_magnifier()
        self.fig.canvas.draw_idle()

print(f"Full image: {img_width}x{img_height}")
print(f"Quantum grid: {TARGET_SIZE}x{TARGET_SIZE} pixels")
print(f"Ready to analyze pixels!\n")

interactor = PixelInteractor(original_img, pixels, matrix_states, matrix_binary, TARGET_SIZE, grid_x, grid_y)

plt.show()
np.save("qubit_matrix.npy", matrix_states)
