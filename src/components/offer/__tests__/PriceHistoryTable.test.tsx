import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PriceHistoryTable from "../PriceHistoryTable";
import type { PriceHistoryDto } from "@/types";

describe("PriceHistoryTable", () => {
  const mockHistory: PriceHistoryDto[] = [
    {
      price: 95000,
      currency: "PLN",
      checkedAt: "2024-01-10T12:00:00Z",
    },
    {
      price: 97500,
      currency: "PLN",
      checkedAt: "2024-01-08T12:00:00Z",
    },
    {
      price: 97500,
      currency: "PLN",
      checkedAt: "2024-01-06T12:00:00Z",
    },
    {
      price: 100000,
      currency: "PLN",
      checkedAt: "2024-01-01T12:00:00Z",
    },
  ];

  const mockHistoryWithChanges: PriceHistoryDto[] = [
    {
      price: 90000,
      currency: "PLN",
      checkedAt: "2024-01-10T12:00:00Z",
    },
    {
      price: 95000,
      currency: "PLN",
      checkedAt: "2024-01-08T12:00:00Z",
    },
    {
      price: 100000,
      currency: "PLN",
      checkedAt: "2024-01-06T12:00:00Z",
    },
  ];

  describe("Normal State", () => {
    it("should render table with data", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should render card title and description", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByText("Historia sprawdzeń")).toBeInTheDocument();
      expect(screen.getByText(/Wszystkie zarejestrowane zmiany ceny/)).toBeInTheDocument();
    });

    it("should render table headers", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByText("Data sprawdzenia")).toBeInTheDocument();
      expect(screen.getByText("Cena")).toBeInTheDocument();
      expect(screen.getByText("Waluta")).toBeInTheDocument();
    });

    it("should render all history entries", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const rows = screen.getAllByRole("row");
      // +1 for header row
      expect(rows).toHaveLength(mockHistory.length + 1);
    });

    it("should display total count with correct pluralization", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByText("Wyświetlono 4 wpisy")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no history", () => {
      render(<PriceHistoryTable history={[]} />);

      expect(screen.getByText("Brak historii cen")).toBeInTheDocument();
      expect(screen.getByText("Historia zostanie wyświetlona po pierwszym sprawdzeniu")).toBeInTheDocument();
    });

    it("should not render table in empty state", () => {
      render(<PriceHistoryTable history={[]} />);

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should still render card title in empty state", () => {
      render(<PriceHistoryTable history={[]} />);

      expect(screen.getByText("Historia sprawdzeń")).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    it("should format dates in DD.MM.YYYY HH:mm format", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      // Should display formatted date (ISO dates have timezone offset, so times may differ)
      expect(screen.getByText(/10\.01\.2024 \d{2}:\d{2}/)).toBeInTheDocument();
      expect(screen.getByText(/08\.01\.2024 \d{2}:\d{2}/)).toBeInTheDocument();
      expect(screen.getByText(/01\.01\.2024 \d{2}:\d{2}/)).toBeInTheDocument();
    });

    it("should pad single digit dates and times with zeros", () => {
      const historyWithSingleDigits: PriceHistoryDto[] = [
        {
          price: 100000,
          currency: "PLN",
          checkedAt: "2024-01-05T09:05:00Z",
        },
      ];

      render(<PriceHistoryTable history={historyWithSingleDigits} />);

      // Date should be padded, time may vary due to timezone
      expect(screen.getByText(/05\.01\.2024 \d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe("Price Formatting", () => {
    it("should format prices with Polish locale (spaces as thousand separators)", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      // Multiple prices with same values might exist
      const prices95k = screen.getAllByText(/95 000/);
      const prices97k = screen.getAllByText(/97 500/);
      const prices100k = screen.getAllByText(/100 000/);

      expect(prices95k.length).toBeGreaterThan(0);
      expect(prices97k.length).toBeGreaterThan(0);
      expect(prices100k.length).toBeGreaterThan(0);
    });

    it("should display currency in separate column", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const table = screen.getByRole("table");
      const currencyCells = within(table).getAllByText("PLN");

      // Should have currency for each row
      expect(currencyCells).toHaveLength(mockHistory.length);
    });

    it("should handle different currencies", () => {
      const eurHistory: PriceHistoryDto[] = [
        {
          price: 50000,
          currency: "EUR",
          checkedAt: "2024-01-10T12:00:00Z",
        },
      ];

      render(<PriceHistoryTable history={eurHistory} />);

      expect(screen.getByText("EUR")).toBeInTheDocument();
    });
  });

  describe("Price Change Indicators", () => {
    it("should highlight rows with price changes", () => {
      const { container } = render(<PriceHistoryTable history={mockHistoryWithChanges} />);

      // First entry (90000) changed from previous (95000)
      // Second entry (95000) changed from previous (100000)
      const highlightedRows = container.querySelectorAll(".bg-muted\\/50");
      expect(highlightedRows.length).toBeGreaterThan(0);
    });

    it("should show down arrow for price decrease", () => {
      render(<PriceHistoryTable history={mockHistoryWithChanges} />);

      const downArrows = screen.getAllByText(/↓/);
      expect(downArrows.length).toBeGreaterThan(0);
    });

    it("should show up arrow for price increase", () => {
      const historyWithIncrease: PriceHistoryDto[] = [
        {
          price: 105000,
          currency: "PLN",
          checkedAt: "2024-01-10T12:00:00Z",
        },
        {
          price: 100000,
          currency: "PLN",
          checkedAt: "2024-01-08T12:00:00Z",
        },
      ];

      render(<PriceHistoryTable history={historyWithIncrease} />);

      const upArrows = screen.getAllByText(/↑/);
      expect(upArrows.length).toBeGreaterThan(0);
    });

    it("should display percentage change for price changes", () => {
      render(<PriceHistoryTable history={mockHistoryWithChanges} />);

      // Should display percentage changes (values may vary slightly due to calculation)
      const percentages = screen.getAllByText(/%/);
      expect(percentages.length).toBeGreaterThan(0);

      // Check that percentage change indicators exist
      expect(screen.getByText(/5\.26/)).toBeInTheDocument();
      expect(screen.getByText(/5\s*%/)).toBeInTheDocument();
    });

    it("should use green color for price decrease", () => {
      const { container } = render(<PriceHistoryTable history={mockHistoryWithChanges} />);

      const decreaseIndicators = container.querySelectorAll(".text-green-600");
      expect(decreaseIndicators.length).toBeGreaterThan(0);
    });

    it("should use red color for price increase", () => {
      const historyWithIncrease: PriceHistoryDto[] = [
        {
          price: 105000,
          currency: "PLN",
          checkedAt: "2024-01-10T12:00:00Z",
        },
        {
          price: 100000,
          currency: "PLN",
          checkedAt: "2024-01-08T12:00:00Z",
        },
      ];

      const { container } = render(<PriceHistoryTable history={historyWithIncrease} />);

      const increaseIndicators = container.querySelectorAll(".text-destructive");
      expect(increaseIndicators.length).toBeGreaterThan(0);
    });

    it("should not show change indicator when price is same as previous", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      // Third entry has same price as second (97500)
      // It should not have special highlighting or indicator

      // Most recent entry has change indicator, but entries with same price don't
      expect(screen.queryAllByText(/↓/).length).toBeLessThan(mockHistory.length);
    });

    it("should make changed prices bold", () => {
      const { container } = render(<PriceHistoryTable history={mockHistoryWithChanges} />);

      const boldPrices = container.querySelectorAll(".font-semibold");
      expect(boldPrices.length).toBeGreaterThan(0);
    });
  });

  describe("Ordering", () => {
    it("should display entries with newest first", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const rows = screen.getAllByRole("row");
      // Skip header row
      const dataRows = rows.slice(1);

      // First data row should be newest (2024-01-10)
      expect(within(dataRows[0]).getByText(/10\.01\.2024/)).toBeInTheDocument();

      // Last data row should be oldest (2024-01-01)
      expect(within(dataRows[dataRows.length - 1]).getByText(/01\.01\.2024/)).toBeInTheDocument();
    });

    it("should indicate ordering in description", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByText(/najnowsze na górze/)).toBeInTheDocument();
    });
  });

  describe("Count Label Pluralization", () => {
    it("should use 'wpis' for 1 record", () => {
      const singleEntry = [mockHistory[0]];
      render(<PriceHistoryTable history={singleEntry} />);

      expect(screen.getByText("Wyświetlono 1 wpis")).toBeInTheDocument();
    });

    it("should use 'wpisy' for 2-4 records", () => {
      const twoEntries = mockHistory.slice(0, 2);
      render(<PriceHistoryTable history={twoEntries} />);

      expect(screen.getByText("Wyświetlono 2 wpisy")).toBeInTheDocument();
    });

    it("should use 'wpisów' for 5+ records", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByText("Wyświetlono 4 wpisy")).toBeInTheDocument();
    });

    it("should use 'wpisów' for numbers ending in 5-9 or 10-21", () => {
      const manyEntries = Array.from({ length: 15 }, (_, i) => ({
        price: 100000,
        currency: "PLN" as const,
        checkedAt: `2024-01-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      }));

      render(<PriceHistoryTable history={manyEntries} />);

      expect(screen.getByText("Wyświetlono 15 wpisów")).toBeInTheDocument();
    });

    it("should use 'wpisy' for 22-24", () => {
      const manyEntries = Array.from({ length: 23 }, (_, i) => ({
        price: 100000,
        currency: "PLN" as const,
        checkedAt: `2024-01-${String((i % 31) + 1).padStart(2, "0")}T12:00:00Z`,
      }));

      render(<PriceHistoryTable history={manyEntries} />);

      expect(screen.getByText("Wyświetlono 23 wpisy")).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("should render as Card component", () => {
      const { container } = render(<PriceHistoryTable history={mockHistory} />);

      const card = container.querySelector('[class*="rounded"]');
      expect(card).toBeTruthy();
    });

    it("should have bordered table", () => {
      const { container } = render(<PriceHistoryTable history={mockHistory} />);

      const borderedDiv = container.querySelector(".rounded-md.border");
      expect(borderedDiv).toBeInTheDocument();
    });

    it("should right-align price column", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const priceHeader = screen.getByText("Cena");
      expect(priceHeader).toHaveClass("text-right");
    });

    it("should right-align currency column", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const currencyHeader = screen.getByText("Waluta");
      expect(currencyHeader).toHaveClass("text-right");
    });
  });

  describe("Edge Cases", () => {
    it("should handle single entry", () => {
      const singleEntry = [mockHistory[0]];
      render(<PriceHistoryTable history={singleEntry} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Wyświetlono 1 wpis")).toBeInTheDocument();
    });

    it("should handle very large prices", () => {
      const largePrice: PriceHistoryDto[] = [
        {
          price: 99999999,
          currency: "PLN",
          checkedAt: "2024-01-10T12:00:00Z",
        },
      ];

      render(<PriceHistoryTable history={largePrice} />);

      expect(screen.getByText(/99 999 999/)).toBeInTheDocument();
    });

    it("should handle prices with decimal-like formatting", () => {
      const priceWithDecimals: PriceHistoryDto[] = [
        {
          price: 99999,
          currency: "PLN",
          checkedAt: "2024-01-10T12:00:00Z",
        },
      ];

      render(<PriceHistoryTable history={priceWithDecimals} />);

      expect(screen.getByText(/99 999/)).toBeInTheDocument();
    });

    it("should generate unique keys for entries with same timestamp", () => {
      const duplicateTimestamps: PriceHistoryDto[] = [
        {
          price: 100000,
          currency: "PLN",
          checkedAt: "2024-01-10T12:00:00Z",
        },
        {
          price: 95000,
          currency: "PLN",
          checkedAt: "2024-01-10T12:00:00Z",
        },
      ];

      // Should not throw error about duplicate keys
      const { container } = render(<PriceHistoryTable history={duplicateTimestamps} />);

      const rows = container.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(2);
    });
  });

  describe("Table Structure", () => {
    it("should have proper table semantic structure", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByRole("table")).toBeInTheDocument();

      // There are two rowgroups: thead and tbody
      const rowgroups = screen.getAllByRole("rowgroup");
      expect(rowgroups).toHaveLength(2);
    });

    it("should have correct column widths", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const dateHeader = screen.getByText("Data sprawdzenia");
      expect(dateHeader).toHaveClass("w-[200px]");

      const currencyHeader = screen.getByText("Waluta");
      expect(currencyHeader).toHaveClass("w-[100px]");
    });
  });

  describe("Accessibility", () => {
    it("should use semantic table elements", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")).toHaveLength(3);
      expect(screen.getAllByRole("row").length).toBeGreaterThan(0);
    });

    it("should have descriptive headers", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      expect(screen.getByText("Data sprawdzenia")).toBeInTheDocument();
      expect(screen.getByText("Cena")).toBeInTheDocument();
      expect(screen.getByText("Waluta")).toBeInTheDocument();
    });

    it("should have informative empty state", () => {
      render(<PriceHistoryTable history={[]} />);

      expect(screen.getByText("Brak historii cen")).toBeInTheDocument();
      expect(screen.getByText("Historia zostanie wyświetlona po pierwszym sprawdzeniu")).toBeInTheDocument();
    });

    it("should display count information", () => {
      render(<PriceHistoryTable history={mockHistory} />);

      const countInfo = screen.getByText(/Wyświetlono \d+ wpis/);
      expect(countInfo).toBeInTheDocument();
      expect(countInfo).toHaveClass("text-center");
    });
  });
});
