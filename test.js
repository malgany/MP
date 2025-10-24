const { parseWidget, renderWidgetToHtml } = require('./lib');

const view = `<Card
  size="md"
  confirm={{ label: "Add to calendar", action: { type: "calendar.add" } }}
  cancel={{ label: "Discard", action: { type: "calendar.discard" } }}
>
  <Row align="start">
    <Col align="start" gap={1} width={80}>
      <Caption value={date.name} size="lg" color="secondary" />
      <Title value={date.number} size="3xl" />
    </Col>

    <Col flex="auto">
      {events.map((item) => (
        <Row
          key={item.id}
          padding={{x:3, y:2}}
          gap={3}
          radius="xl"
          background={item.isNew ? "none" : "surface-secondary"}
          border={
            item.isNew
              ? { size: 1, color: item.color, style: "dashed" }
              : undefined
          }
        >
          <Box width={4} height="40px" radius="full" background={item.color} />
          <Col>
            <Text value={item.title} />
            <Text value={item.time} size="sm" color="tertiary" />
          </Col>
        </Row>
      ))}
    </Col>
  </Row>
</Card>`;

const state = {"date": {"name": "Friday", "number": "28"}, "events": [{"id": "lunch", "time": "12:00 - 12:45 PM", "color": "red-400", "isNew": false, "title": "Lunch"}, {"id": "q1-roadmap-review", "time": "1:00 - 2:00 PM", "color": "blue-400", "isNew": true, "title": "Q1 roadmap review"}, {"id": "team-standup", "time": "3:30 - 4:00 PM", "color": "red-400", "isNew": false, "title": "Team standup"}]};

// Arvore JSON (sem dependência de DOM):
const { widgetTree } = parseWidget(view, state);
console.log(widgetTree);

// Renderização fiel usando o preview oficial (requer jsdom).
(async () => {
    const html = await renderWidgetToHtml(view, state);
    console.log(html);
})();