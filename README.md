# Kaelor Bracelet Studio

Crea una calculadora de manillas personalizadas llamada KAELOR Joyería con React.

Requisitos:

1. Layout con dos paneles (izquierda 50%, derecha 50%)

2. Header con logo KAELOR en dorado (#FFD700)

3. Tema: Fondo negro (#1a1a1a), acentos dorados, texto blanco

4. Panel izquierdo debe tener:

   - Título "Selectores"

   - Espacio para selector de balinés (grid vacío por ahora)

   - Espacio para botones de patrones

   - Espacio para macramé checkbox

   - Espacio para resumen de costos

   - Botones "Limpiar" y "Guardar" al final

5. Panel derecho debe tener:

   - Canvas de 400x400px para previsualización

   - Área para leyenda de colores

   - Área para composición detallada

   - Área para historial

6. Estilos:

   - Bordes dorados (#FFD700) 2px en cards

   - Fondo de cards #2d2d2d

   - Texto principal blanco

   - Hover con brillo dorado

Usa React hooks para estado.

Agrega selector de balinés al panel izquierdo.

Crea un grid de 5 cards con estos balinés:

- 3MM Italy ($3.500) - Color referencia: rosa #FF69B4

- 4MM Italy ($5.000) - Color referencia: naranja #FFA500

- 5MM Italy ($7.500) - Color referencia: oro #FFD700

- 6MM Italy ($10.000) - Color referencia: verde #7CB342

- 8MM Italy ($13.500) - Color referencia: azul #42A5F5

Cada card debe tener:

- Nombre del balinés

- Precio

- Barra pequeña con el color de referencia

- Input numérico para cantidad (min: 0)

- Botón "+ Agregar" en dorado

Cuando clickea "+ Agregar":

- Agrega esos balinés al estado carrito

- Limpia el input

- Muestra un pequeño feedback

Estilos:

- Cards con borde dorado, fondo #2d2d2d

- Hover: sombra dorada, transform scale(1.02)

- Input: fondo #3a3a3a, borde dorado

- Botón: gradiente #FFD700 → #D4AF37

Agrega sección de insumos adicionales debajo de neoprenos.

Checkbox estilizado con:

- Checkbox dorado

- Texto: "Rollo Celular/Macramé - $12.000"

- Estado: checked por defecto (true)

Cuando el usuario cambia el estado (check/uncheck):

- El costo total se recalcula automáticamente

- La previsualización se actualiza

Estilos: Fondo #2d2d2d, borde dorado, padding 15px

Agrega 5 botones de selección de patrón (radio buttons estilizados).

Los 5 patrones son:

1. SENCILLO - Todos los balinés en una hilera circular

2. 2 CARRILES - Dos hileras concéntricas

3. 3 CARRILES - Tres hileras concéntricas

4. ALTERNADO TAMAÑOS - Intercala pequeño-grande-pequeño

5. ALTERNADO NEOPRENO - Intercala oro-neopreno-oro

Requisitos:

- Radio buttons: solo uno seleccionado a la vez

- Default: SENCILLO

- Cuando selecciona uno:

  - Estado patternActual = nuevo patrón

  - Canvas se redibuja

  

Estilos:

- Botón no seleccionado: borde dorado 2px, fondo #2d2d2d, texto blanco

- Botón seleccionado: fondo gradiente dorado, texto negro, sombra

- Hover: brillo dorado extra

- Cursor: pointer

Grid: 2 columnas en desktop, 1 en mobile

Agrega sección de RESUMEN DE COSTOS al final del panel izquierdo.

Mostrar 4 cards:

1. "Costo Total" → $0 (se actualiza)

2. "Precio Venta (100%)" → $0 (doble del costo)

3. "Ganancia" → $0 (diferencia, en verde)

4. "Margen" → 0% (siempre 100%)

Lógica:

- Sumar precio de cada balinés en carrito

- Sumar $12.000 si macramé está checked

- Costo Total = suma

- Precio Venta = Costo Total × 2.0

- Ganancia = Precio Venta - Costo Total

- Margen = 100% (fijo)

Formato de números: "$XXX.XXX" con puntos separadores

Cards:

- Fondo gradiente (#f0f9ff → #e8f8f5)

- Borde izquierdo dorado 5px

- Texto principal en negro/oscuro

- Número en dorado grande (24px)

Implementa la previsualización circular en canvas HTML5.

REQUISITOS CRÍTICOS:

Canvas:

- 400x400px

- Fondo negro #1a1a1a

- ID: "braceletCanvas"

Función drawBracelet(balinés, pattern):

- Recibe array de balinés con: { type, size, price, color }

- Recibe patrón: 'sencillo', '2carriles', '3carriles', 'alternado_tamaños', 'alternado_neopreno'

CÁLCULO DE POSICIONES:

SENCILLO:

- Un radio fijo: 70px

- ángulo = (i * 360) / cantidad de balinés

- x = centerX + cos(ángulo * π/180) * radio

- y = centerY + sin(ángulo * π/180) * radio

2_CARRILES:

- Primera mitad de balinés: radio = 65px

- Segunda mitad: radio = 90px

- ángulo = (i * 360) / cantidad

3_CARRILES:

- Primer tercio: radio = 55px

- Segundo tercio: radio = 75px

- Tercer tercio: radio = 95px

- ángulo = (i * 360) / cantidad

ALTERNADO_TAMAÑOS:

- Ordenar balinés de menor a mayor tamaño

- Intercalar: pequeño-grande-pequeño

- Distribuir en círculo como SENCILLO (radio 70px)

ALTERNADO_NEOPRENO:

- Separar balinés oro de neoprenos

- Intercalar: oro-neopreno-oro-neopreno

- Distribuir en círculo como SENCILLO

DIBUJO DE BALINÉS:

- Tamaños en canvas:

  * 3MM: 16px diámetro

  * 4MM: 18px

  * 5MM: 20px

  * 6MM: 22px

  * 8MM: 26px

  * Neopreno: 22px

- Colores (usar clase color proporcionada):

  * 3MM: #FF69B4

  * 4MM: #FFA500

  * 5MM: #FFD700

  * 6MM: #7CB342

  * 8MM: #42A5F5

  * Neopreno: #000000

- Efectos:

  * Círculo relleno con color

  * Sombra: shadowBlur 8, shadowColor rgba(0,0,0,0.5)

  * Reflejo dorado: pequeño círculo en la parte superior (20% del tamaño)

  * Sin outline/stroke

ACTUALIZACIÓN AUTOMÁTICA:

- Redibuja cuando:

  * Usuario agrega balinés

  * Usuario cambia patrón

  * Usuario activa/desactiva macramé

MANEJO DE CASOS ESPECIALES:

- Si no hay balinés: mostrar mensaje "Agrega balinés para ver previsualización"

- Si cantidad > 100: mostrar advertencia pero permitir

Agrega panel de COMPOSICIÓN DETALLADA en el panel derecho, debajo del canvas.

Mostrar:

- Título: "COMPOSICIÓN"

- Lista de balinés con formato:

  "20× 3MM ($3.500 c/u)"

  "10× 4MM ($5.000 c/u)"

  etc.

- Si hay neoprenos:

  "5× 6MM Neopreno ($10.000 c/u)"

- Si macramé está checked:

  "1× Rollo Celular/Macramé ($12.000)"

- Línea divisoria dorada

- "Total de balinés: XX"

- "Patrón seleccionado: [Sencillo/2 Carriles/etc]"

Estilos:

- Fondo #2d2d2d

- Borde izquierdo dorado 3px

- Texto blanco/gris claro

- Font-size: 12px

- Números en dorado destacados

- Padding: 15px

- Margin-top: 15px

Agrega LEYENDA DE COLORES debajo del canvas.

Mostrar 6 items en grid 2 columnas:

- ● 3MM (pequeño círculo color #FF69B4, texto "3MM")

- ● 4MM (círculo #FFA500, texto "4MM")

- ● 5MM (círculo #FFD700, texto "5MM")

- ● 6MM (círculo #7CB342, texto "6MM")

- ● 8MM (círculo #42A5F5, texto "8MM")

- ● Neo (círculo #000000, texto "Neo")

Estilos:

- Font-size: 11px

- Círculos: 14px diámetro

- Padding: 8px

- Flex/grid gap: 8px

- Hover: sombra dorada suave

- Cursor: pointer (solo visual, no interactivo)

Implementa guardado y historial de manillas.

BOTÓN LIMPIAR:

- Borra todos los balinés del carrito

- Resetea patrón a "SENCILLO"

- Mantiene macramé checked

- Pide confirmación

BOTÓN GUARDAR:

- Solo activo si hay balinés

- Recopila:

  * Composición: "20×3MM + 10×4MM"

  * Patrón: nombre del patrón

  * Costo total

  * Precio venta

  * Ganancia

  * Timestamp

  

- Guarda en estado y localStorage

- LocalStorage key: 'kaelor_manillas'

- Muestra confirmación "✅ Manilla guardada"

- Limpia automáticamente el carrito

PANEL HISTORIAL:

- Mostrar últimas 5 manillas guardadas

- Formato compacto por card:

  "20×3MM + 10×4MM"

  "$150.000 → $300.000"

  "+$150.000 (2 Carriles)"

  

- Cada card con:

  * Fondo #2d2d2d

  * Borde izquierdo dorado 3px

  * Font-size: 11px

  * Botón X (eliminar) arriba a la derecha

  

- Click en una: cargar esa composición (en desarrollo futuro)

- Botón eliminar: remove del array y localStorage

Aplica el diseño visual final de KAELOR Joyería.

HEADER:

- Logo "KAELOR" en font elegante (Playfair Display o serif similar)

  * Font-size: 32px

  * Font-weight: 700

  * Color: gradiente dorado (#FFD700 → #D4AF37)

  * Text-shadow: 0 2px 8px rgba(0,0,0,0.5)

  

- Subtítulo "Joyería" en dorado más claro

  * Font-size: 12px

  * Color: #D4AF37

  

- Fondo: negro #1a1a1a

- Padding: 30px 20px

- Borde inferior: 3px dorado #FFD700

PANELES:

- Fondo general: #1a1a1a

- Cards: fondo #2d2d2d

- Bordes: dorado #FFD700 2px

- Border-radius: 8px

- Padding: 15px

BOTONES:

- Gradiente: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)

- Color texto: #1a1a1a (negro, para contraste)

- Padding: 12px 30px

- Border-radius: 6px

- Font-weight: 600

- Transition: all 0.3s ease

- Hover:

  * Background: linear-gradient(135deg, #FFF700 0%, #FFD700 100%)

  * Transform: translateY(-2px)

  * Box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4)

- Active/Click: transform: scale(0.95)

INPUTS:

- Fondo: #3a3a3a

- Borde: dorado #FFD700 2px

- Color texto: blanco #FFFFFF

- Padding: 8px 12px

- Border-radius: 4px

- Transition: 0.3s

- Focus:

  * Box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2)

  * Border-color: #FFF700

CHECKBOXES:

- Accent color: dorado #FFD700

- Size: 20px × 20px

TRANSICIONES:

- Todos los elementos: transition: all 0.3s ease

- Suave y elegante

SOMBRAS DORADAS:

- Usar en varios elementos: box-shadow: 0 0 20px rgba(212, 175, 55, 0.3)

- En hover de elementos importantes

TEXT:

- Principal: blanco #FFFFFF

- Secundario: gris claro #CCCCCC

- Acentos: dorado #FFD700

- Font: 'Segoe UI', sans-serif

RESPONSIVE:

- En mobile: reducir padding y font-size en 10-15%

Hazlo responsive para funcionar perfectamente en iPhone 11 (375px).

BREAKPOINTS:

- Desktop (>1024px): 2 paneles lado a lado (actual)

- Tablet (768-1024px): Paneles apilados, canvas 320px

- Mobile (<768px): Panel único, todo apilado

CAMBIOS EN MOBILE:

Layout:

- Grid 1 columna

- Panel izquierdo 100%

- Panel derecho 100% (debajo)

Canvas:

- Tamaño: 300x300px (en lugar de 400x400)

- Ajustar proporciones (radio × 0.75)

Selectores:

- Grid 2 columnas para balinés

- Cards más pequeñas

- Font-size reducido 12%

Botones:

- Full width (100%)

- Padding: 10px 20px

- Font-size: 14px

Resumen:

- Grid 2 columnas (en lugar de 4)

- Cards más compactas

- Font-size: 14px

Historial:

- Stack vertical completo

- Cards full width

- Font-size: 10px

Headers:

- Font-size reducido 15%

Usar media queries CSS

Agrega validaciones y mejora la UX final.

VALIDACIONES:

- Inputs: Solo números, min 0, max 200

- Botón Guardar: Deshabilitado si no hay balinés

- Botón Limpiar: Pide confirmación antes de borrar

- Canvas: Si > 100 balinés, mostrar advertencia "Muchos balinés: la visualización puede ser lenta"

UX MEJORADA:

- Loading spinner cuando dibuja canvas (si > 50 balinés)

- Tooltip en hover de botones patrones explicando cada uno

- Animación entrada suave de cards

- Feedback visual en clicks (ripple effect dorado)

- Confirmación visual al guardar (✅ con duración 2s)

- Contador de balinés bajo el canvas "Total: XX balinés"

PERFORMANCE:

- Memoizar función drawBracelet

- Debounce en canvas redraw (100ms)

- Lazy load de historial (solo mostrar últimas 5)

ACCESIBILIDAD:

- aria-label en inputs

- aria-label en botones

- tabIndex en orden correcto

- Color contrast: dorado/negro 4.5:1 (WCAG AA)

- Keyboard navigation: Tab entre elementos

FINAL CHECK:

- Sin errores en consola

- Sin warnings React

- LocalStorage funciona

- Responsive en 3 tamaños

- Animaciones suaves

- Todos los colores dorados/negros aplicados

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kaelor-bead-designer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e3500a72-f6c3-4b37-9fe9-a891d0fe88c7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
