/**
 * CarouselPanel — controlled thumbnail row + active card editor.
 *
 * All card state lives in App.jsx. This component is purely display + interaction:
 *   • Renders the horizontal thumbnail row
 *   • Handles drag-to-reorder via @dnd-kit/sortable (calls onReorder)
 *   • Shows CoverEditor or CardEditor for the active slot
 *   • Add / Remove card buttons
 *
 * Props:
 *   cards          {Array}    ordered card objects { id, isCover, data }
 *   activeCardId   {string}
 *   onActiveChange {function} (cardId) => void
 *   onCardUpdate   {function} (cardId, cardData) => void
 *   onAddCard      {function} () => void
 *   onRemoveCard   {function} (cardId) => void
 *   onReorder      {function} (newCardsArray) => void
 *   getRef         {function} (cardId) => React ref object
 */

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Minus, Copy, GripHorizontal, ImageIcon } from 'lucide-react'

import CardEditor   from './CardEditor'
import CardPreview  from './CardPreview'
import ImagePicker  from './ImagePicker'

// ─── constants ────────────────────────────────────────────────────────────────

const THUMB_SIZE   = 120   // visual display size (CSS px)
const RENDER_SIZE  = 360   // Konva stage size — export pixelRatio = 1080/360 = 3
const SCALE        = THUMB_SIZE / RENDER_SIZE   // 0.333…
const MAX_CARDS    = 10

// ─── ScaledPreview — renders at RENDER_SIZE, displays at THUMB_SIZE ───────────

function ScaledPreview({ previewRef, cardData, thumbProps, slideIndex, noImage }) {
  return (
    <div
      style={{ width: THUMB_SIZE, height: THUMB_SIZE, overflow: 'hidden', position: 'relative' }}
    >
      {/* Konva stage at full render size, scaled down by CSS */}
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', lineHeight: 0 }}>
        <CardPreview
          ref={previewRef}
          cardData={cardData}
          size={RENDER_SIZE}
          {...thumbProps}
          slideIndex={slideIndex}
        />
      </div>

      {/* No-image placeholder */}
      {noImage && (
        <div className="absolute inset-0 bg-neutral-900/90 flex items-center justify-center">
          <ImageIcon size={20} className="text-neutral-600" />
        </div>
      )}
    </div>
  )
}

// ─── CoverSlot ────────────────────────────────────────────────────────────────

function CoverSlot({ card, isActive, onSelect, previewRef, thumbProps }) {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <button
        onClick={onSelect}
        aria-label="Cover photo slot"
        className={`
          relative rounded-lg overflow-hidden transition-all duration-150
          ${isActive
            ? 'ring-2 ring-white'
            : 'ring-1 ring-neutral-800 hover:ring-neutral-500'
          }
        `}
        style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
      >
        <ScaledPreview
          previewRef={previewRef}
          cardData={card.data}
          thumbProps={thumbProps}
          slideIndex={1}
          noImage={!card.data.imageUrl}
        />

        <span className="
          absolute bottom-0 inset-x-0 px-1 py-0.5 text-center
          text-[9px] text-white/60 bg-black/40 pointer-events-none select-none
        ">
          Cover
        </span>
      </button>

      {/* Spacer aligns height with content card drag handles */}
      <div className="h-5" />
    </div>
  )
}

// ─── SortableSlot ─────────────────────────────────────────────────────────────

function SortableSlot({ card, displayNumber, slideIndex, isActive, onSelect, previewRef, thumbProps }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:  CSS.Transform.toString(transform),
        transition,
        opacity:    isDragging ? 0.35 : 1,
        zIndex:     isDragging ? 50 : 'auto',
      }}
      className="flex flex-col items-center gap-1.5 shrink-0"
    >
      <button
        onClick={onSelect}
        aria-label={`Card ${displayNumber}`}
        className={`
          relative rounded-lg overflow-hidden transition-all duration-150
          ${isActive
            ? 'ring-2 ring-white'
            : 'ring-1 ring-neutral-800 hover:ring-neutral-500'
          }
        `}
        style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
      >
        <ScaledPreview
          previewRef={previewRef}
          cardData={card.data}
          thumbProps={thumbProps}
          slideIndex={slideIndex}
        />

        <span className="
          absolute bottom-0 inset-x-0 px-1 py-0.5 text-center
          text-[9px] text-white/60 bg-black/40 pointer-events-none select-none
        ">
          {displayNumber}
        </span>
      </button>

      {/* Drag handle — separate from click target */}
      <div
        {...attributes}
        {...listeners}
        className="
          flex items-center justify-center h-5
          text-neutral-700 hover:text-neutral-400
          cursor-grab active:cursor-grabbing
          transition-colors touch-none
        "
        aria-label="Drag to reorder"
      >
        <GripHorizontal size={13} />
      </div>
    </div>
  )
}

// ─── CoverEditor ──────────────────────────────────────────────────────────────

function CoverEditor({ card, onCardUpdate }) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-neutral-400 mb-1">Cover Photo</p>
        <p className="text-xs text-neutral-600 leading-relaxed">
          First slide your audience sees. No text overlay is applied to this card.
        </p>
      </div>
      <ImagePicker
        currentUrl={card.data.imageUrl}
        onSelect={(url) => onCardUpdate(card.id, { ...card.data, imageUrl: url })}
      />
    </div>
  )
}

// ─── CarouselPanel ────────────────────────────────────────────────────────────

export default function CarouselPanel({
  cards = [],
  activeCardId,
  onActiveChange,
  onCardUpdate,
  onAddCard,
  onRemoveCard,
  onDuplicateCard,
  onReorder,
  getRef,
  watermark             = null,
  showSlideIndicator    = false,
  indicatorPosition     = 'bottom-right',
  brand                 = 'kshitij',
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const sortable = cards.slice(1)
    const oldIdx   = sortable.findIndex(c => c.id === active.id)
    const newIdx   = sortable.findIndex(c => c.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    onReorder?.([cards[0], ...arrayMove(sortable, oldIdx, newIdx)])
  }

  const activeCard  = cards.find(c => c.id === activeCardId) ?? cards[0]
  const activeIndex = cards.findIndex(c => c.id === activeCardId)
  const sortableCards = cards.slice(1)

  const canAdd       = cards.length < MAX_CARDS
  const canRemove    = !activeCard?.isCover && cards.length > 2
  const canDuplicate = !activeCard?.isCover && cards.length < MAX_CARDS

  const thumbProps = {
    watermark,
    showSlideIndicator,
    totalSlides: cards.length,
    indicatorPosition,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Thumbnail row ───────────────────────────────────────────────── */}
      <div className="
        flex items-end gap-3 px-4 py-3 shrink-0
        overflow-x-auto overflow-y-visible
        bg-neutral-900/30 border-b border-neutral-800
      ">
        {/* Cover slot (always position 0, never draggable) */}
        {cards[0] && (
          <CoverSlot
            card={cards[0]}
            isActive={activeCardId === 'cover'}
            onSelect={() => onActiveChange?.('cover')}
            previewRef={getRef?.('cover') ?? null}
            thumbProps={thumbProps}
          />
        )}

        <div className="self-center h-14 w-px bg-neutral-800 shrink-0" />

        {/* Sortable content cards */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableCards.map(c => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sortableCards.map((card, si) => (
              <SortableSlot
                key={card.id}
                card={card}
                displayNumber={si + 2}
                slideIndex={si + 2}
                isActive={activeCardId === card.id}
                onSelect={() => onActiveChange?.(card.id)}
                previewRef={getRef?.(card.id) ?? null}
                thumbProps={thumbProps}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add / Duplicate / Remove controls */}
        <div className="flex flex-col gap-1.5 shrink-0 self-center ml-1">
          <button
            onClick={onAddCard}
            disabled={!canAdd}
            aria-label="Add card"
            title={canAdd ? 'Add card' : 'Maximum 10 cards'}
            className="
              w-7 h-7 rounded-md flex items-center justify-center
              bg-neutral-800 hover:bg-neutral-700
              text-neutral-400 hover:text-white
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <Plus size={13} />
          </button>

          <button
            onClick={() => canDuplicate && onDuplicateCard?.(activeCard.id)}
            disabled={!canDuplicate}
            aria-label="Duplicate card"
            title={
              activeCard?.isCover
                ? 'Cover cannot be duplicated'
                : !canDuplicate
                  ? 'Maximum 10 cards'
                  : 'Duplicate this card'
            }
            className="
              w-7 h-7 rounded-md flex items-center justify-center
              bg-neutral-800 hover:bg-neutral-700
              text-neutral-400 hover:text-white
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <Copy size={13} />
          </button>

          <button
            onClick={() => canRemove && onRemoveCard?.(activeCard.id)}
            disabled={!canRemove}
            aria-label="Remove active card"
            title={
              activeCard?.isCover
                ? 'Cover cannot be removed'
                : !canRemove
                  ? 'At least one content card required'
                  : 'Remove this card'
            }
            className="
              w-7 h-7 rounded-md flex items-center justify-center
              bg-neutral-800 hover:bg-red-950
              text-neutral-500 hover:text-red-400
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <Minus size={13} />
          </button>
        </div>
      </div>

      {/* ── Active editor pane ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeCard?.isCover && brand !== 'bold' ? (
          <CoverEditor card={activeCard} onCardUpdate={onCardUpdate} />
        ) : activeCard ? (
          <div className="p-4">
            <CardEditor
              key={activeCard.id}
              cardIndex={activeIndex}
              totalCards={cards.length}
              cardData={activeCard.data}
              onUpdate={(data) => onCardUpdate?.(activeCard.id, data)}
              brand={brand}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
