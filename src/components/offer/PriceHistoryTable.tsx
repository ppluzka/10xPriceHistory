import type { PriceHistoryDto } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PriceHistoryTableProps {
  history: PriceHistoryDto[];
}

export default function PriceHistoryTable({ history }: PriceHistoryTableProps) {
  // Check if we have any data
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historia sprawdzeń</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <p className="font-medium">Brak historii cen</p>
              <p className="text-sm mt-1">Historia zostanie wyświetlona po pierwszym sprawdzeniu</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia sprawdzeń</CardTitle>
        <CardDescription>Wszystkie zarejestrowane zmiany ceny (najnowsze na górze)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Data sprawdzenia</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="w-[100px] text-right">Waluta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry, index) => {
                const date = new Date(entry.checkedAt);
                const formattedDate = formatDate(date);
                const formattedPrice = new Intl.NumberFormat("pl-PL").format(entry.price);

                // Check if price changed from previous entry
                const previousEntry = history[index + 1];
                const priceChanged = previousEntry && previousEntry.price !== entry.price;

                return (
                  <TableRow key={`${entry.checkedAt}-${index}`} className={priceChanged ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">{formattedDate}</TableCell>
                    <TableCell className="text-right">
                      {priceChanged && previousEntry && (
                        <PriceChangeIndicator currentPrice={entry.price} previousPrice={previousEntry.price} />
                      )}
                      <span className={priceChanged ? "font-semibold" : ""}> {formattedPrice}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{entry.currency}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Info about table ordering */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Wyświetlono {history.length} {getRecordsLabel(history.length)}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Component to show price change indicator
 */
function PriceChangeIndicator({ currentPrice, previousPrice }: { currentPrice: number; previousPrice: number }) {
  const difference = currentPrice - previousPrice;
  const isIncrease = difference > 0;
  const percentChange = ((difference / previousPrice) * 100).toFixed(2);

  return (
    <span className={`ml-2 text-xs font-semibold ${isIncrease ? "text-destructive" : "text-green-600"}`}>
      {isIncrease ? "↑" : "↓"} {Math.abs(parseFloat(percentChange))}%
    </span>
  );
}

/**
 * Format date for table display (DD.MM.YYYY HH:mm)
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Get Polish label for records count
 */
function getRecordsLabel(count: number): string {
  if (count === 1) return "wpis";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return "wpisy";
  }
  return "wpisów";
}
